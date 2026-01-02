function Sidebar({ isOpen, onToggle, chats, activeChat, onNewChat, onSwitchChat, onDeleteChat }) {
  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Sidebar Header */}
      <div className="p-4">
        <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen ? (
            <>
              <div className="flex items-center space-x-3">
                <button onClick={onToggle} className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <span className="text-xl font-semibold text-gray-900">VirtuOS</span>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </>
          ) : (
            <button onClick={onToggle} className="text-gray-600 hover:text-gray-900 py-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 pt-2 pb-3">
        <button 
          onClick={onNewChat}
          className={`w-full flex items-center ${isOpen ? 'space-x-3' : 'justify-center'} text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-2.5 transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isOpen && <span className="font-medium">New chat</span>}
        </button>
      </div>

      {/* Explore Gems */}
      <div className="px-4 pb-3">
        <button className={`w-full flex items-center ${isOpen ? 'space-x-3' : 'justify-center'} text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-2.5 transition-colors`}>
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
          {isOpen && <span className="font-medium">Explore Gems</span>}
        </button>
      </div>

      {/* Chat List */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto px-4 pt-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">RECENT</h3>
          <div className="space-y-0.5">
            {chats.map((chat) => (
              <div 
                key={chat.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  activeChat === chat.id 
                    ? 'bg-orange-50 text-gray-900' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <button 
                  onClick={() => onSwitchChat(chat.id)}
                  className="flex-1 text-left text-sm truncate"
                >
                  {chat.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed Recent Dots */}
      {!isOpen && (
        <div className="flex-1 flex flex-col items-center justify-start pt-6 space-y-3">
          {chats.slice(0, 3).map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSwitchChat(chat.id)}
              className={`w-2 h-2 rounded-full transition-colors ${
                activeChat === chat.id ? 'bg-orange-500' : 'bg-gray-400 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* Settings Footer */}
      <div className="p-4 border-t border-gray-100">
        <button className={`w-full flex items-center ${isOpen ? 'space-x-3' : 'justify-center'} text-gray-700 hover:bg-orange-50 rounded-lg px-3 py-2.5 transition-colors`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isOpen && <span className="font-medium">Settings and help</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
