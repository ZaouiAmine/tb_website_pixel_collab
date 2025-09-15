import { useEffect } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { webSocketService } from '../services/websocket.js'

const ConnectionManager = ({ children }) => {
  const {
    setConnected,
    handlePixelUpdate,
    handleUserUpdate,
    handleChatMessage,
    handleCanvasUpdate,
    loadCanvas,
    loadUsers,
    loadMessages,
    currentUser
  } = useCanvasStore()

  useEffect(() => {
    // Set up WebSocket event listeners
    const handleConnection = (data) => {
      setConnected(data.connected)
    }

    const handlePixelUpdateEvent = (pixelData) => {
      handlePixelUpdate(pixelData)
    }

    const handleUserUpdateEvent = (userData) => {
      handleUserUpdate(userData)
    }

    const handleChatMessageEvent = (message) => {
      handleChatMessage(message)
    }

    const handleCanvasUpdateEvent = (updateData) => {
      handleCanvasUpdate(updateData)
    }

    // Register event listeners
    webSocketService.on('connection', handleConnection)
    webSocketService.on('pixelUpdate', handlePixelUpdateEvent)
    webSocketService.on('userUpdate', handleUserUpdateEvent)
    webSocketService.on('chatMessage', handleChatMessageEvent)
    webSocketService.on('canvasUpdate', handleCanvasUpdateEvent)

    // Connect to WebSocket
    webSocketService.connect()

    // Load initial data
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadCanvas(),
          loadUsers(),
          loadMessages()
        ])
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }

    loadInitialData()

    // Cleanup on unmount
    return () => {
      webSocketService.off('connection', handleConnection)
      webSocketService.off('pixelUpdate', handlePixelUpdateEvent)
      webSocketService.off('userUpdate', handleUserUpdateEvent)
      webSocketService.off('chatMessage', handleChatMessageEvent)
      webSocketService.off('canvasUpdate', handleCanvasUpdateEvent)
      webSocketService.disconnect()
    }
  }, [
    setConnected,
    handlePixelUpdate,
    handleUserUpdate,
    handleChatMessage,
    handleCanvasUpdate,
    loadCanvas,
    loadUsers,
    loadMessages
  ])

  // Reconnect when user joins
  useEffect(() => {
    if (currentUser.online && !webSocketService.isConnected()) {
      webSocketService.connect()
    }
  }, [currentUser.online])

  return children
}

export default ConnectionManager
