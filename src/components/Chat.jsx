import { useState, useRef, useEffect } from 'react'

const Chat = ({ messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const formatTime = (timestamp) => {
    try {
      // Handle both Unix timestamp (seconds) and milliseconds
      const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000)
      if (isNaN(date.getTime())) {
        return '--:--'
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (error) {
      console.error('Date formatting error:', error)
      return '--:--'
    }
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/20 bg-black/5 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
          <span className="text-xl">💬</span>
          Chat
        </h3>
        <p className="text-gray-300 text-sm">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 custom-scrollbar" 
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8 flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col items-start w-full overflow-hidden">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 max-w-[85%] hover:bg-white/15 transition-all duration-200 hover:scale-[1.02] shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <span className="font-semibold text-white text-sm truncate flex-shrink">
                    {msg.username}
                  </span>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-gray-200 text-sm break-words leading-relaxed overflow-wrap-anywhere">
                  {msg.message}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/20 bg-black/5 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white/15 transition-all duration-200 resize-none"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            <span className="hidden sm:inline text-sm font-medium">Send</span>
            <span className="text-sm">📤</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat
