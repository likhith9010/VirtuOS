import { useEffect, useRef, useState } from 'react'

function LiveViewer({ vmName = 'Arch Linux', onConnect, onDisconnect }) {
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const [status, setStatus] = useState('Disconnected')
  const [fps, setFps] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const frameCountRef = useRef(0)
  const lastFpsUpdateRef = useRef(Date.now())

  // Connect to websockify
  const connect = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setStatus('Connecting...')
    const ctx = canvas.getContext('2d')
    const wsUrl = `ws://localhost:6080/?vm=${encodeURIComponent(vmName)}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected to Live Stream bridge')
      setStatus('Connected - Waiting for frames...')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'connected') {
          setStatus('Connected')
          setIsConnected(true)
          if (onConnect) onConnect()
        } else if (message.type === 'frame') {
          // Draw frame on canvas
          const img = new Image()
          img.onload = () => {
            // Scale to fit canvas while maintaining aspect ratio
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height
            )
            const x = (canvas.width - img.width * scale) / 2
            const y = (canvas.height - img.height * scale) / 2

            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
          }
          img.src = message.data

          // Update FPS counter
          frameCountRef.current++
          const now = Date.now()
          if (now - lastFpsUpdateRef.current >= 1000) {
            setFps(frameCountRef.current)
            frameCountRef.current = 0
            lastFpsUpdateRef.current = now
          }
        } else if (message.type === 'error') {
          setStatus('Error: ' + message.message)
        }
      } catch (err) {
        console.error('Error processing message:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      setStatus('Connection Failed')
      setIsConnected(false)
    }

    ws.onclose = () => {
      setStatus('Disconnected')
      setIsConnected(false)
      if (onDisconnect) onDisconnect()
    }

    // Keyboard event handlers
    const handleKeyDown = (e) => {
      if (ws.readyState === WebSocket.OPEN && document.activeElement === canvas) {
        e.preventDefault()
        ws.send(JSON.stringify({
          type: 'keyboard',
          keyCode: e.keyCode,
          key: e.key,
          isPressed: true
        }))
      }
    }

    const handleKeyUp = (e) => {
      if (ws.readyState === WebSocket.OPEN && document.activeElement === canvas) {
        e.preventDefault()
        ws.send(JSON.stringify({
          type: 'keyboard',
          keyCode: e.keyCode,
          key: e.key,
          isPressed: false
        }))
      }
    }

    // Add keyboard listeners to window
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Make canvas focusable
    canvas.tabIndex = 1
  }

  // Disconnect from websockify
  const disconnect = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    setStatus('Disconnected')
    setIsConnected(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [])

  // Send text input
  const sendText = (text) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'keystring',
        text: text
      }))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 
            status === 'Connecting...' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`}></div>
          <span>{status}</span>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && <span className="text-gray-400">{fps} FPS</span>}
          {isConnected ? (
            <button
              onClick={disconnect}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={status === 'Connecting...'}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-xs transition-colors"
            >
              {status === 'Connecting...' ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-black flex items-center justify-center p-2">
        {!isConnected && status !== 'Connecting...' ? (
          <div className="text-center text-gray-400 space-y-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xl font-medium text-white mb-2">Not Connected</p>
              <p className="text-sm mb-4">Click Connect to start live view</p>
              <p className="text-xs text-gray-500">
                Make sure VNC services are running in the VM:<br />
                x0vncserver and websockify on port 6080
              </p>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="max-w-full max-h-full border border-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
            onClick={(e) => e.target.focus()}
          />
        )}
      </div>

      {/* Text Input - only show when connected */}
      {isConnected && (
        <div className="px-4 py-2 bg-gray-100 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type text and press Enter to send to VM..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  sendText(e.target.value)
                  e.target.value = ''
                }
              }}
            />
            <button
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
              onClick={(e) => {
                const input = e.target.previousSibling
                if (input.value) {
                  sendText(input.value)
                  input.value = ''
                }
              }}
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Click canvas & type to send keyboard input directly</p>
        </div>
      )}
    </div>
  )
}

export default LiveViewer
