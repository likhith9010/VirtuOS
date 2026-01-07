import { useState, useEffect } from 'react'

function ScreenshotsPanel({ isProcessing = false, computerUseActive = false, agentStatus = null, agentIteration = 0 }) {
  const [vms, setVms] = useState([])
  const [selectedVM, setSelectedVM] = useState(null)
  const [vmStatus, setVMStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('controls') // 'controls', 'live', or 'display'
  const [screenshot, setScreenshot] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [vncStatus, setVncStatus] = useState('disconnected') // 'connecting', 'connected', 'disconnected'

  useEffect(() => {
    fetchVMs()
    const interval = setInterval(() => {
      if (selectedVM) {
        fetchVMStatus(selectedVM)
      }
    }, 5000) // Only check status, not screenshots
    return () => clearInterval(interval)
  }, [selectedVM])

  // Check VNC connection status
  useEffect(() => {
    const checkVncConnection = async () => {
      if (activeTab === 'live' && vmStatus?.isRunning) {
        try {
          const ws = new WebSocket('ws://127.0.0.1:6080')
          ws.onopen = () => {
            setVncStatus('connected')
            ws.close()
          }
          ws.onerror = () => {
            setVncStatus('disconnected')
          }
        } catch (error) {
          setVncStatus('disconnected')
        }
      }
    }

    // Listen for messages from VNC iframe
    const handleMessage = (event) => {
      if (event.data.type === 'vnc-connected') {
        setVncStatus('connected')
      } else if (event.data.type === 'vnc-disconnected') {
        setVncStatus('disconnected')
      }
    }

    window.addEventListener('message', handleMessage)
    
    if (activeTab === 'live') {
      setVncStatus('connecting')
      checkVncConnection()
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [activeTab, vmStatus?.isRunning])

  const fetchVMs = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/vms')
      const data = await response.json()
      if (data.success && data.vms.length > 0) {
        setVms(data.vms)
        setSelectedVM(data.vms[0].name)
        fetchVMStatus(data.vms[0].name)
      }
    } catch (error) {
      console.error('Error fetching VMs:', error)
    }
  }

  const fetchVMStatus = async (vmName) => {
    try {
      const response = await fetch(`http://localhost:3000/api/vm/${encodeURIComponent(vmName)}/status`)
      const data = await response.json()
      if (data.success) {
        setVMStatus(data.status)
      }
    } catch (error) {
      console.error('Error fetching VM status:', error)
    }
  }

  const fetchScreenshot = async (vmName) => {
    setCapturing(true)
    try {
      const response = await fetch(`http://localhost:3000/api/vm/${encodeURIComponent(vmName)}/screenshot`)
      const data = await response.json()
      if (data.success) {
        setScreenshot(`http://localhost:3000/${data.path}?t=${Date.now()}`)
      }
    } catch (error) {
      console.error('Error fetching screenshot:', error)
    } finally {
      setCapturing(false)
    }
  }

  const handleCaptureScreenshot = () => {
    if (selectedVM && vmStatus?.isRunning) {
      fetchScreenshot(selectedVM)
    }
  }

  const handleStart = async () => {
    if (!selectedVM) return
    setLoading(true)
    try {
      await fetch(`http://localhost:3000/api/vm/${encodeURIComponent(selectedVM)}/start`, {
        method: 'POST'
      })
      setTimeout(() => {
        fetchVMStatus(selectedVM)
        setLoading(false)
      }, 8000) // Wait 23 seconds for VM to boot
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!selectedVM) return
    setLoading(true)
    try {
      await fetch(`http://localhost:3000/api/vm/${encodeURIComponent(selectedVM)}/stop`, {
        method: 'POST'
      })
      setTimeout(() => {
        fetchVMStatus(selectedVM)
        setLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  if (vms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No VirtualBox VMs found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex">
      {/* Left Sidebar - Tabs */}
      <div className="w-14 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-6 space-y-4">
        <button
          onClick={() => setActiveTab('controls')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'controls'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
          title="VM Controls"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'live'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
          title="Live View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        <button
          onClick={() => setActiveTab('display')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'display'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
          title="Screenshots"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">{activeTab === 'controls' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md w-full space-y-6">
              {/* VM Icon */}
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
                  <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                  </svg>
                </div>
                {vmStatus && (
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg ${
                    vmStatus.isRunning ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                )}
              </div>

              {/* VM Name */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedVM}</h2>
                <p className="text-sm text-gray-500 uppercase tracking-wider">
                  {vmStatus ? vmStatus.state : 'Unknown'}
                </p>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleStart}
                  disabled={loading || vmStatus?.isRunning}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Starting...' : 'Start VM'}
                </button>
                <button
                  onClick={handleStop}
                  disabled={loading || !vmStatus?.isRunning}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Stopping...' : 'Stop VM'}
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchVMStatus(selectedVM)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="flex-1 flex flex-col bg-gray-900 h-full">
            {/* Live View Header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  vncStatus === 'connected' ? 'bg-green-500' : 
                  vncStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`}></div>
                <span className="text-white text-sm font-medium">
                  {selectedVM} - Live View
                </span>
                <span className="text-gray-400 text-xs">
                  ({vncStatus === 'connected' ? 'Connected' : 
                    vncStatus === 'connecting' ? 'Connecting...' : 
                    'Disconnected'})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setVncStatus('connecting')
                    // Force iframe reload
                    const iframe = document.getElementById('vnc-iframe')
                    if (iframe) iframe.src = iframe.src
                  }}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  Reconnect
                </button>
              </div>
            </div>

            {/* VNC Display Area */}
            <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
              {/* Orange Wave Animation - shown when processing */}
              {isProcessing && vmStatus?.isRunning && (
                <>
                  <div className="wave-container">
                    <div className="wave-animation wave-1"></div>
                    <div className="wave-animation wave-2"></div>
                    <div className="wave-animation wave-3"></div>
                    <div className="wave-animation wave-4"></div>
                  </div>
                  <div className="processing-glow"></div>
                  <div className="processing-overlay">
                    <div className="processing-indicator">
                      <div className="processing-spinner"></div>
                      {computerUseActive ? (
                        <>
                          <p className="text-lg font-medium">
                            {agentStatus?.phase === 'capture' && '📸 Capturing Screen...'}
                            {agentStatus?.phase === 'think' && '🤔 AI Analyzing...'}
                            {agentStatus?.phase === 'act' && '⚡ Executing Action...'}
                            {!agentStatus?.phase && 'Computer Use Active'}
                          </p>
                          <p className="text-sm text-gray-300 mt-1">
                            {agentStatus?.message || `Iteration ${agentIteration}`}
                          </p>
                          <div className="mt-3 flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {[...Array(Math.min(agentIteration, 10))].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-orange-400"></div>
                              ))}
                              {[...Array(Math.max(0, 10 - agentIteration))].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-gray-600"></div>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">{agentIteration}/10</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-medium">Processing Task...</p>
                          <p className="text-sm text-gray-300 mt-1">VirtuOS is working</p>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {vmStatus?.isRunning ? (
                <>
                  {/* Loading overlay - shown while connecting */}
                  {vncStatus !== 'connected' && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                      <div className="text-center text-gray-400 space-y-4">
                        <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-white">Connecting to VNC server...</p>
                        <p className="text-xs text-gray-500">Make sure websockify is running on port 6080</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    id="vnc-iframe"
                    src="/vnc.html"
                    className={`absolute inset-0 w-full h-full border-none ${vncStatus !== 'connected' ? 'opacity-0' : 'opacity-100'}`}
                    title="VNC Viewer"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400 space-y-4">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div>
                      <p className="text-xl font-medium text-white">VM is not running</p>
                      <p className="text-sm mt-2">Start the VM from Controls tab to enable live view</p>
                      <p className="text-xs mt-4 text-gray-500">Make sure x0vncserver and websockify are running inside the VM</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="flex-1 flex flex-col bg-gray-100">
            {/* Screenshots Header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${vmStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-white text-sm font-medium">
                  {selectedVM} - Screenshots
                </span>
              </div>
            </div>

            {/* Screenshot Display Area */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {vmStatus?.isRunning ? (
                <>
                  <div className="flex-1 bg-black rounded-lg border-2 border-gray-300 shadow-2xl flex items-center justify-center overflow-hidden mb-4">
                    {screenshot ? (
                      <img 
                        src={screenshot} 
                        alt="VM Screenshot" 
                        className="max-w-full max-h-full object-contain"
                        onError={() => setScreenshot(null)}
                      />
                    ) : (
                      <div className="text-center text-gray-400 space-y-4 p-8">
                        <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-lg mb-2">No Screenshot Captured</p>
                          <p className="text-sm text-gray-500">Click the button below to capture a screenshot</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Capture Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleCaptureScreenshot}
                      disabled={capturing}
                      className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {capturing ? 'Capturing...' : 'Capture Screenshot'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-500 space-y-4">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div>
                      <p className="text-xl font-medium">VM is not running</p>
                      <p className="text-sm mt-2">Start the VM from Controls tab to capture screenshots</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScreenshotsPanel
