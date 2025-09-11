import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { taubyteService } from '../services/taubyteService';
import { MessageCircle, Send } from 'lucide-react';

export const Chat: React.FC = () => {
  const { currentUser, messages } = useGameStore();
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to chat messages from the service
  useEffect(() => {
    const handleChatMessage = () => {
      // Messages are now handled by the global store via taubyteService
      // This listener is kept for any additional UI updates if needed
    };

    taubyteService.on('chatMessage', handleChatMessage);

    return () => {
      taubyteService.off('chatMessage', handleChatMessage);
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    // Send message to server - it will be added to chat via polling
    taubyteService.sendChatMessage(newMessage.trim()).catch(error => {
      console.error('Failed to send message:', error);
    });
    setNewMessage('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="pixel-card">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-pixel-accent" />
        <h3 className="font-pixel text-sm text-pixel-text">Chat</h3>
        <button
          className="ml-auto pixel-button text-xs px-2 py-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className={`space-y-2 ${isExpanded ? 'h-64' : 'h-32'} overflow-y-auto`}>
        {messages.length === 0 ? (
          <p className="text-xs text-pixel-text opacity-50 font-pixel text-center">
            No messages yet
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 border border-pixel-border ${
                message.type === 'system' 
                  ? 'bg-pixel-info bg-opacity-20' 
                  : message.userId === currentUser?.id
                  ? 'bg-pixel-accent bg-opacity-20'
                  : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-2 h-2 border border-pixel-border mt-1 flex-shrink-0"
                  style={{ 
                    backgroundColor: message.type === 'system' 
                      ? '#4dabf7' 
                      : '#00ff88' 
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-pixel text-pixel-accent">
                      {message.username}
                    </span>
                    <span className="text-xs text-pixel-text opacity-50">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-pixel-text font-pixel mt-1 break-words">
                    {message.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="pixel-input flex-1 text-xs"
          maxLength={200}
          disabled={!currentUser}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !currentUser}
          className="pixel-button px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
