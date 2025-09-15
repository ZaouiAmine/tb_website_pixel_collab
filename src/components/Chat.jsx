import { useState, useRef, useEffect } from 'react'
import { useCanvasStore } from '../store/canvasStore'

const Chat = () => {
  const { 
    chatMessages, 
    currentUser, 
    sendMessage, 
    isConnected 
  } = useCanvasStore()
  
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (message.trim() && isConnected) {
      await sendMessage(message.trim())
      setMessage('')
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">
        Chat
      </h3>
      
      <div className="space-y-4">
        {/* Messages */}
        <div className="h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
          {chatMessages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">
              No messages yet. Start the conversation!
            </p>
          ) : (
            <div className="space-y-2">
              {chatMessages.map((msg, index) => (
                <div 
                  key={msg.id || index}
                  className={`text-sm ${
                    msg.userId === currentUser.id ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                    msg.userId === currentUser.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    {msg.userId !== currentUser.id && (
                      <div className="text-xs font-semibold text-gray-600 mb-1">
                        {msg.username}
                      </div>
                    )}
                    <div>{msg.message}</div>
                    <div className={`text-xs mt-1 ${
                      msg.userId === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Not connected"}
            disabled={!isConnected}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!isConnected || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        
        {!isConnected && (
          <p className="text-xs text-red-500 text-center">
            Connect to the game to send messages
          </p>
        )}
      </div>
    </div>
  )
}

export default Chat
