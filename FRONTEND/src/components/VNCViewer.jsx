import { useEffect, useRef, useState } from 'react'

function VNCViewer({ host = 'localhost', port = 6080, vrdePort = 5000, onConnect, onDisconnect }) {
  const [status, setStatus] = useState('Connecting...')
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const wsUrl = `ws://${host}:${port}/?host=localhost&port=${vrdePort}`

    const connect = () => {
      if (!mountedRef.current) return
      
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws
        ws.binaryType = 'arraybuffer'

        ws.onopen = () => {
          if (!mountedRef.current) return
          console.log('WebSocket connected to VNC bridge')
          setStatus('Connected to bridge, establishing VNC...')
          setError(null)
          if (onConnect) onConnect()
        }

        ws.onmessage = (event) => {
          if (!mountedRef.current) return
          console.log('Received VNC data')
          setStatus('Connected - VNC protocol active')
        }

        ws.onerror = (err) => {
          if (!mountedRef.current) return
          console.error('WebSocket error:', err)
          setError('Failed to connect to VNC bridge. Check if VM is running.')
          setStatus('Connection Failed')
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          console.log('WebSocket closed')
          setStatus('Disconnected')
          if (onDisconnect) onDisconnect()
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
  }, [host, port, vrdePort]) // Removed onConnect/onDisconnect from deps to prevent loop

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-center text-gray-400 space-y-4 p-8">
        <div className={error ? '' : 'animate-pulse'}>
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {error ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            )}
          </svg>
        </div>
        <div>
          <p className="text-lg mb-2">{status}</p>
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Bridge: ws://{host}:{port}</p>
            <p>VNC Port: {vrdePort}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VNCViewer
