import { useState, useRef, useEffect } from 'react'

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      username: 'System',
      message: 'Welcome to Pixel Collab! Start drawing and chatting with others.',
      timestamp: new Date(),
      type: 'system'
    },
    {
      id: 2,
      username: 'Alice',
      message: 'Hey everyone! Let\'s create something amazing together! 🎨',
      timestamp: new Date(Date.now() - 300000),
      type: 'user'
    },
    {
      id: 3,
      username: 'Bob',
      message: 'I love the gradient background we\'re working on!',
      timestamp: new Date(Date.now() - 180000),
      type: 'user'
    }
  ])
  
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
      const message = {
        id: messages.length + 1,
        username: 'You',
        message: newMessage.trim(),
        timestamp: new Date(),
        type: 'user'
      }
      setMessages([...messages, message])
      setNewMessage('')
    }
  }

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/20">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">💬</span>
          Chat
        </h3>
        <p className="text-gray-300 text-sm">3 online</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.type === 'system' ? 'items-center' : 'items-start'
            }`}
          >
            {msg.type === 'system' ? (
              <div className="bg-blue-500/20 text-blue-200 text-sm px-3 py-2 rounded-lg max-w-full">
                {msg.message}
              </div>
            ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 max-w-full hover:bg-white/15 transition-colors duration-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white text-sm">
                  {msg.username}
                </span>
                <span className="text-gray-400 text-xs">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-gray-200 text-sm break-words leading-relaxed">
                {msg.message}
              </p>
            </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/20">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
          >
            <span className="hidden sm:inline">Send</span>
            <span className="text-sm">📤</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat
