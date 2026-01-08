import { useState, useRef, useEffect } from 'react'

function ChatBox({ onSendMessage, disabled = false, onStopAgent = null }) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setRecordingTime(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await uploadAndTranscribe(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const uploadAndTranscribe = async (audioBlob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording_${Date.now()}.webm`)

      const response = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success && data.transcript) {
        setMessage(prev => prev + (prev ? ' ' : '') + data.transcript)
      } else {
        console.error('Transcription failed:', data.error)
        alert('Transcription failed: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Failed to transcribe audio')
    }
    setIsTranscribing(false)
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      if (data.success) {
        setAttachedFiles(prev => [...prev, ...data.files])
      } else {
        alert('Failed to upload: ' + data.error)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files')
    }
    setIsUploading(false)
    e.target.value = '' // Reset input
  }

  const removeAttachment = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if ((message.trim() || attachedFiles.length > 0) && !disabled) {
      // Send all attachments for display, mark type for AI context (only images sent to AI)
      const attachments = attachedFiles.map(f => ({
        name: f.originalName,
        path: f.type === 'image' ? `images/${f.filename}` : `pdfs/${f.filename}`,
        type: f.type
      }))
      onSendMessage(message, attachments)
      setMessage('')
      setAttachedFiles([])
    }
  }

  const handleStop = () => {
    if (onStopAgent) {
      onStopAgent()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="max-w-4xl mx-auto">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map((file, index) => (
              <div 
                key={index} 
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm ${
                  file.type === 'image' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {file.type === 'image' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="truncate max-w-[150px]">{file.originalName}</span>
                <button 
                  onClick={() => removeAttachment(index)}
                  className="hover:bg-gray-200 rounded p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={`flex items-center space-x-2 border rounded-xl px-4 py-3 bg-white shadow-sm ${
            disabled ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
          }`}>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              multiple
              className="hidden"
            />
            {/* Plus button - opens file picker */}
            <button 
              type="button" 
              disabled={disabled || isUploading} 
              onClick={() => fileInputRef.current?.click()}
              className={`p-1 rounded transition-colors ${
                isUploading 
                  ? 'text-orange-500 animate-spin' 
                  : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
              } disabled:opacity-50`}
              title="Attach images or PDFs"
            >
              {isUploading ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled || isRecording}
              placeholder={
                isRecording 
                  ? `🎙️ Recording... ${formatTime(recordingTime)}` 
                  : isTranscribing 
                    ? '⏳ Transcribing...' 
                    : disabled 
                      ? "Agent is working..." 
                      : "Ask VirtuOS to do something..."
              }
              className={`flex-1 outline-none text-sm placeholder-gray-400 focus:placeholder-gray-500 transition-colors bg-transparent disabled:cursor-not-allowed ${
                isRecording ? 'text-red-500 placeholder-red-400' : 'text-gray-700'
              }`}
            />
            {/* Microphone button */}
            <button 
              type="button" 
              disabled={disabled || isTranscribing} 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-1 rounded transition-colors ${
                isRecording 
                  ? 'text-red-500 bg-red-50 animate-pulse' 
                  : isTranscribing
                    ? 'text-orange-500 animate-spin'
                    : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
              } disabled:opacity-50`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isTranscribing ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : isRecording ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            
            {/* Send or Stop button */}
            {disabled ? (
              <button 
                type="button"
                onClick={handleStop}
                className="bg-orange-300 hover:bg-orange-500 text-white p-2 rounded-lg transition-all transform hover:scale-105"
                title="Stop agent"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={!message.trim() || isRecording || isTranscribing}
                className="text-orange-300 hover:text-orange-500 hover:bg-orange-50 p-1 rounded transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 rotate-45" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            )}
          </div>
        </form>
        <p className="text-xs text-gray-400 text-center mt-2">
          {disabled ? '🤖 VirtuOS is controlling the VM... Click stop to cancel' : 'VirtuOS can make mistakes. Please verify important information.'}
        </p>
      </div>
    </div>
  )
}

export default ChatBox
