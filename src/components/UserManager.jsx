import { useState } from 'react'
import { useCanvasStore } from '../store/canvasStore'

const UserManager = () => {
  const { 
    currentUser, 
    onlineUsers, 
    isConnected, 
    isLoading, 
    error, 
    joinGame, 
    leaveGame, 
    clearError 
  } = useCanvasStore()
  
  const [username, setUsername] = useState(currentUser.username)
  const [showJoinForm, setShowJoinForm] = useState(!currentUser.online)

  const handleJoin = async (e) => {
    e.preventDefault()
    if (username.trim()) {
      await joinGame(username.trim())
      setShowJoinForm(false)
    }
  }

  const handleLeave = async () => {
    await leaveGame()
    setShowJoinForm(true)
  }

  if (showJoinForm) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Join the Game
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              onClick={clearError}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">
          Welcome, {currentUser.username}!
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            Online Users ({onlineUsers.length})
          </h4>
          <div className="max-h-32 overflow-y-auto">
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No other users online</p>
            ) : (
              <div className="space-y-1">
                {onlineUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    ></div>
                    <span className={user.id === currentUser.id ? 'font-semibold' : ''}>
                      {user.username}
                    </span>
                    {user.id === currentUser.id && <span className="text-xs text-blue-600">(You)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleLeave}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Leave Game
        </button>
      </div>
    </div>
  )
}

export default UserManager
