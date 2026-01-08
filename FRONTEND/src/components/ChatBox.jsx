import { useState } from 'react'

function ChatBox({ onSendMessage, disabled = false, onStopAgent = null }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message)
      setMessage('')
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
        <form onSubmit={handleSubmit}>
          <div className={`flex items-center space-x-2 border rounded-xl px-4 py-3 bg-white shadow-sm ${
            disabled ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
          }`}>
            <button type="button" disabled={disabled} className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 p-1 rounded transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              placeholder={disabled ? "Agent is working..." : "Ask VirtuOS to do something..."}
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 focus:placeholder-gray-500 transition-colors bg-transparent disabled:cursor-not-allowed"
            />
            <button type="button" disabled={disabled} className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 p-1 rounded transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
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
                disabled={!message.trim()}
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
