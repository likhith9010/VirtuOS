import { useEffect, useRef, useState } from 'react'

function RDPViewer({ host = 'localhost', port = 6080, rdpPort = 5000, onConnect, onDisconnect }) {
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const [status, setStatus] = useState('Connecting...')
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const wsUrl = `ws://${host}:${port}/?host=localhost&port=${rdpPort}`

    const connect = () => {
      if (!mountedRef.current) return
      
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mountedRef.current) return
          console.log('WebSocket connected to RDP bridge')
          setStatus('Connecting to RDP server...')
          setError(null)
        }

        ws.onmessage = (event) => {
          if (!mountedRef.current) return
          
          try {
            const message = JSON.parse(event.data)
            
            if (message.type === 'connected') {
              setStatus('Connected')
              if (onConnect) onConnect()
            } else if (message.type === 'bitmap') {
              // Draw bitmap on canvas
              const img = new Image()
              img.onload = () => {
                ctx.drawImage(img, message.data.x, message.data.y)
              }
              img.src = 'data:image/png;base64,' + message.data.data
            } else if (message.type === 'error') {
              setError(message.message)
              setStatus('Connection Failed')
            }
          } catch (err) {
            console.error('Error processing RDP message:', err)
          }
        }

        ws.onerror = (err) => {
          if (!mountedRef.current) return
          console.error('WebSocket error:', err)
          setError('Failed to connect to RDP bridge')
          setStatus('Connection Failed')
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          setStatus('Disconnected')
          if (onDisconnect) onDisconnect()
        }

        // Handle mouse events
        const handleMouseMove = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const rect = canvas.getBoundingClientRect()
            const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
            const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
            
            ws.send(JSON.stringify({
              type: 'mouse',
              x: x,
              y: y,
              button: 0,
              isPressed: false
            }))
          }
        }

        const handleMouseDown = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const rect = canvas.getBoundingClientRect()
            const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
            const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
            
            ws.send(JSON.stringify({
              type: 'mouse',
              x: x,
              y: y,
              button: e.button === 0 ? 1 : e.button === 2 ? 2 : 3,
              isPressed: true
            }))
          }
        }

        const handleMouseUp = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const rect = canvas.getBoundingClientRect()
            const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
            const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
            
            ws.send(JSON.stringify({
              type: 'mouse',
              x: x,
              y: y,
              button: e.button === 0 ? 1 : e.button === 2 ? 2 : 3,
              isPressed: false
            }))
          }
        }

        // Handle keyboard events
        const handleKeyDown = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            e.preventDefault()
            ws.send(JSON.stringify({
              type: 'keyboard',
              keyCode: e.keyCode,
              isPressed: true
            }))
          }
        }

        const handleKeyUp = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            e.preventDefault()
            ws.send(JSON.stringify({
              type: 'keyboard',
              keyCode: e.keyCode,
              isPressed: false
            }))
          }
        }

        canvas.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('mousedown', handleMouseDown)
        canvas.addEventListener('mouseup', handleMouseUp)
        canvas.addEventListener('keydown', handleKeyDown)
        canvas.addEventListener('keyup', handleKeyUp)
        canvas.tabIndex = 1
        canvas.focus()

        return () => {
          canvas.removeEventListener('mousemove', handleMouseMove)
          canvas.removeEventListener('mousedown', handleMouseDown)
          canvas.removeEventListener('mouseup', handleMouseUp)
          canvas.removeEventListener('keydown', handleKeyDown)
          canvas.removeEventListener('keyup', handleKeyUp)
        }

      } catch (err) {
        if (!mountedRef.current) return
        console.error('Error creating WebSocket:', err)
        setError(err.message)
        setStatus('Failed to connect')
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [host, port, rdpPort])

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      {error ? (
        <div className="text-center text-gray-400 space-y-4 p-8">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-lg mb-2">{status}</p>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          width={1280} 
          height={720}
          className="max-w-full max-h-full object-contain"
          style={{ cursor: 'default' }}
        />
      )}
    </div>
  )
}

export default RDPViewer
