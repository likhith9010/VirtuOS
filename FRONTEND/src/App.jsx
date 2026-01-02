import './App.css'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import ChatArea from './components/ChatArea'
import ChatBox from './components/ChatBox'
import ScreenshotsPanel from './components/ScreenshotsPanel'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  
  // Chat session management
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [pendingChatSwitch, setPendingChatSwitch] = useState(null)

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('virtuos-chats')
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats)
      setChats(parsedChats)
      if (parsedChats.length > 0) {
        setActiveChat(parsedChats[0].id)
      }
    } else {
      // Create first chat
      const firstChat = {
        id: Date.now(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString()
      }
      setChats([firstChat])
      setActiveChat(firstChat.id)
    }
  }, [])

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('virtuos-chats', JSON.stringify(chats))
    }
  }, [chats])

  // Get current chat messages
  const currentMessages = chats.find(chat => chat.id === activeChat)?.messages || []

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:3000')
    
    newSocket.on('connect', () => {
      console.log('Connected to backend')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from backend')
      setIsConnected(false)
    })

    newSocket.on('chat-response', (data) => {
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChat) {
          const updatedMessages = [...chat.messages, data]
          
          // Update chat title from first user message
          if (chat.title === 'New Chat' && data.role === 'user') {
            const title = data.content.slice(0, 40) + (data.content.length > 40 ? '...' : '')
            return { ...chat, messages: updatedMessages, title }
          }
          
          return { ...chat, messages: updatedMessages }
        }
        return chat
      }))
      
      // Stop thinking indicator when assistant responds
      if (data.role === 'assistant') {
        setIsThinking(false)
      }
    })

    newSocket.on('chat-error', (error) => {
      console.error('Chat error:', error)
      setIsThinking(false)
      setChats(prev => prev.map(chat => 
        chat.id === activeChat 
          ? { 
              ...chat, 
              messages: [...chat.messages, {
                role: 'assistant',
                content: `Error: ${error.error}`,
                timestamp: new Date().toISOString()
              }]
            }
          : chat
      ))
    })

    setSocket(newSocket)

    return () => newSocket.close()
  }, [activeChat])

  // Check if message is a task (for wave animation)
  const isTaskMessage = (message) => {
    const taskKeywords = ['open', 'play', 'search', 'find', 'create', 'make', 'start', 'run', 'execute', 'launch', 'click', 'type', 'browse', 'go to', 'navigate']
    const lowerMessage = message.toLowerCase()
    return taskKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  const handleSendMessage = (message) => {
    if (socket && message.trim()) {
      // Only show thinking indicator (wave animation) for tasks
      if (isTaskMessage(message)) {
        setIsThinking(true)
      }
      
      const currentChat = chats.find(chat => chat.id === activeChat)
      
      // Send message to backend
      socket.emit('chat-message', {
        message: message,
        conversationHistory: currentChat?.messages.filter(msg => msg.role !== 'system') || []
      })
    }
  }

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString()
    }
    setChats(prev => [newChat, ...prev])
    setActiveChat(newChat.id)
  }

  const handleSwitchChat = (chatId) => {
    const currentChat = chats.find(chat => chat.id === activeChat)
    
    // Show confirmation if current chat has messages
    if (currentChat && currentChat.messages.length > 0) {
      setPendingChatSwitch(chatId)
      setShowExitModal(true)
    } else {
      setActiveChat(chatId)
    }
  }

  const confirmChatSwitch = () => {
    if (pendingChatSwitch) {
      setActiveChat(pendingChatSwitch)
      setPendingChatSwitch(null)
    }
    setShowExitModal(false)
  }

  const cancelChatSwitch = () => {
    setPendingChatSwitch(null)
    setShowExitModal(false)
  }

  const handleDeleteChat = (chatId) => {
    setChats(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId)
      
      // If deleting active chat, switch to first available
      if (chatId === activeChat && filtered.length > 0) {
        setActiveChat(filtered[0].id)
      } else if (filtered.length === 0) {
        // Create new chat if all deleted
        const newChat = {
          id: Date.now(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString()
        }
        setActiveChat(newChat.id)
        return [newChat]
      }
      
      return filtered
    })
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chats={chats}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Switch Chat?</h3>
            <p className="text-gray-600 mb-6">Your current conversation will be saved. Are you sure you want to switch?</p>
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={cancelChatSwitch}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmChatSwitch}
                className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors"
              >
                Switch Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content and Chat Area Column */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar - Always visible */}
        <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-between bg-orange-50 h-[60px]">
          {!isSidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">VirtuOS</h1>
            </div>
          )}
          <div className="flex-1"></div>
          <Navbar />
        </div>

        {/* Content Below Navbar */}
        <div className="flex-1 flex overflow-hidden">
          <ChatArea messages={currentMessages} isConnected={isConnected} isThinking={isThinking} />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white">
            <ScreenshotsPanel isProcessing={isThinking} />
            <ChatBox onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
