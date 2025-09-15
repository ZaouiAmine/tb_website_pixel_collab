import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'

const API_BASE = `${window.location.origin}/api` // Use same origin as frontend
const ROOM = 'main' // Default room

export const usePixelGame = () => {
  const [pixels, setPixels] = useState({})
  const [messages, setMessages] = useState([])
  const [pixelChannelUrl, setPixelChannelUrl] = useState(null)
  const [chatChannelUrl, setChatChannelUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial canvas data
  const loadCanvas = useCallback(async () => {
    try {
      console.log('Loading canvas data for room:', ROOM)
      const response = await fetch(`${API_BASE}/getCanvas?room=${ROOM}`)
      console.log('Canvas response status:', response.status)
      
      if (response.ok) {
        const canvasData = await response.json()
        console.log('Canvas data received:', canvasData)
        
        // Convert 2D array to pixels object
        const pixelsObj = {}
        canvasData.forEach((row, y) => {
          row.forEach((color, x) => {
            if (color !== '#ffffff') { // Only store non-white pixels
              pixelsObj[`${x},${y}`] = color
            }
          })
        })
        console.log('Converted pixels object:', pixelsObj)
        setPixels(pixelsObj)
      } else {
        console.error('Failed to load canvas, status:', response.status)
      }
    } catch (error) {
      console.error('Error loading canvas:', error)
    }
  }, [])

  // Load initial chat messages
  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/getMessages?room=${ROOM}`)
      if (response.ok) {
        const messagesData = await response.json()
        setMessages(messagesData)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [])

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/ws?room=${ROOM}`)
      
      if (response.ok) {
        const wsPath = await response.text()
        console.log('Raw WebSocket path from backend:', wsPath)
        
        // Construct WebSocket URL using window.location.origin
        const wsBaseUrl = window.location.origin.replace('http', 'ws')
        const finalWsUrl = `${wsBaseUrl}/${wsPath}`
        
        console.log('Final WebSocket URL:', finalWsUrl)
        
        setPixelChannelUrl(finalWsUrl)
        setChatChannelUrl(finalWsUrl)
      } else {
        console.error('Failed to get WebSocket URL:', response.status)
      }
    } catch (error) {
      console.error('Error getting WebSocket URL:', error)
    }
  }, [])

  // Initialize everything
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)
      await Promise.all([
        loadCanvas(),
        loadMessages(),
        getWebSocketUrl()
      ])
      setIsLoading(false)
    }
    initialize()
  }, [loadCanvas, loadMessages, getWebSocketUrl])

  // Handle pixel updates from WebSocket
  const handlePixelUpdate = useCallback((data) => {
    console.log('Received pixel update:', data)
    const { x, y, color } = data
    setPixels(prev => {
      const newPixels = {
        ...prev,
        [`${x},${y}`]: color
      }
      console.log('Updated pixels:', newPixels)
      return newPixels
    })
  }, [])

  // Handle chat messages from WebSocket
  const handleChatMessage = useCallback((data) => {
    setMessages(prev => [...prev, data])
  }, [])

  // Handle all WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    console.log('Received WebSocket message:', data)
    
    // Check if it's a pixel update (has x, y, color)
    if (data.x !== undefined && data.y !== undefined && data.color !== undefined) {
      handlePixelUpdate(data)
    }
    // Check if it's a chat message (has message field)
    else if (data.message !== undefined) {
      handleChatMessage(data)
    }
  }, [handlePixelUpdate, handleChatMessage])

  // Single WebSocket connection
  const { sendMessage: sendWebSocketMessage } = useWebSocket(pixelChannelUrl, handleWebSocketMessage)

  // Place a pixel
  const placePixel = useCallback((x, y, color, userId = 'user1', username = 'User') => {
    const pixelData = {
      x,
      y,
      color,
      userId,
      username,
      room: ROOM
    }
    console.log('Placing pixel:', pixelData)
    
    // Optimistic update - update the pixel immediately in the frontend
    setPixels(prev => {
      const newPixels = {
        ...prev,
        [`${x},${y}`]: color
      }
      console.log('Optimistic pixel update:', newPixels)
      return newPixels
    })
    
    // Send pixel directly via WebSocket
    sendWebSocketMessage(pixelData)
  }, [sendWebSocketMessage])

  // Send a chat message
  const sendMessage = useCallback((message, userId = 'user1', username = 'User') => {
    const messageData = {
      message,
      userId,
      username,
      room: ROOM
    }
    
    console.log('Sending chat message:', messageData)
    
    // Optimistic update - add message immediately to frontend
    const chatMessage = {
      id: Date.now().toString(),
      userId,
      username,
      message,
      timestamp: Math.floor(Date.now() / 1000)
    }
    setMessages(prev => [...prev, chatMessage])
    
    // Send message directly via WebSocket
    sendWebSocketMessage(messageData)
  }, [sendWebSocketMessage])

  return {
    pixels,
    messages,
    placePixel,
    sendMessage,
    isLoading,
    room: ROOM
  }
}
