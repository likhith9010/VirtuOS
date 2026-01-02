import { useEffect, useRef } from 'react'

function ChatArea({ messages, isConnected, isThinking }) {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  // Show welcome screen if no messages
  if (messages.length === 0) {
    return (
      <div className="w-96 bg-white border-l border-r border-gray-200 p-6">
        <div className="flex flex-col">
          {/* Connection status indicator */}
          <div className="mb-4 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Icon with animation - centered */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-12 h-12 bg-orange-500 rounded-full"></div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            How can I help you today?
          </h2>

          {/* Subtitle */}
          <p className="text-gray-500 mb-8 max-w-xs">
            I can browse the web, use apps, and help you complete tasks automatically.
          </p>

          {/* Suggestion Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              Open YouTube and play a song
            </button>
            <button className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              Find the best price for iPhone 15
            </button>
            <button className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              Check my emails
            </button>
            <button className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              Research AI trends
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show conversation history
  return (
    <div className="w-96 bg-white border-l border-r border-gray-200 flex flex-col">
      {/* Connection status header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Conversation</h3>
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className="space-y-1">
            {msg.role === 'assistant' && (
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-5 h-5 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-700">VirtuOS</span>
              </div>
            )}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="space-y-2 max-w-[85%]">
                <div className={`rounded-xl px-4 py-2.5 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' 
                    : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                
                {/* Screenshot attachment for tasks */}
                {msg.role === 'assistant' && msg.type === 'task' && msg.screenshot && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <div className="bg-gray-100 px-3 py-1.5 flex items-center space-x-2 border-b border-gray-200">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-600 font-medium">Screen Capture</span>
                    </div>
                    <img 
                      src={`data:image/png;base64,${msg.screenshot}`} 
                      alt="VM Screenshot" 
                      className="w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        // Open full screenshot in new window
                        const win = window.open();
                        win.document.write(`<img src="data:image/png;base64,${msg.screenshot}" style="max-width:100%;"/>`);
                      }}
                    />
                  </div>
                )}
                
                {/* Action Status Box for tasks */}
                {msg.role === 'assistant' && msg.type === 'task' && msg.actions && msg.actions.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-green-700">Action Completed</span>
                    </div>
                    <ul className="space-y-1.5">
                      {msg.actions.map((action, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-gray-600">VirtuOS is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatArea
