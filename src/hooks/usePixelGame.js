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

  // Get WebSocket URLs
  const getWebSocketUrls = useCallback(async () => {
    try {
      const [pixelResponse, chatResponse] = await Promise.all([
        fetch(`${API_BASE}/getPixelChannelURL?room=${ROOM}`),
        fetch(`${API_BASE}/getChatChannelURL?room=${ROOM}`)
      ])

      if (pixelResponse.ok && chatResponse.ok) {
        const pixelUrl = await pixelResponse.text()
        const chatUrl = await chatResponse.text()
        
        console.log('Raw pixel URL from backend:', pixelUrl)
        console.log('Raw chat URL from backend:', chatUrl)
        
        // Construct WebSocket URLs using window.location.origin (backend already includes ws- prefix)
        const wsBaseUrl = window.location.origin.replace('http', 'ws')
        const finalPixelUrl = `${wsBaseUrl}/${pixelUrl}`
        const finalChatUrl = `${wsBaseUrl}/${chatUrl}`
        
        console.log('Final pixel WebSocket URL:', finalPixelUrl)
        console.log('Final chat WebSocket URL:', finalChatUrl)
        
        setPixelChannelUrl(finalPixelUrl)
        setChatChannelUrl(finalChatUrl)
      } else {
        console.error('Failed to get WebSocket URLs:', {
          pixelStatus: pixelResponse.status,
          chatStatus: chatResponse.status
        })
      }
    } catch (error) {
      console.error('Error getting WebSocket URLs:', error)
    }
  }, [])

  // Initialize everything
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)
      await Promise.all([
        loadCanvas(),
        loadMessages(),
        getWebSocketUrls()
      ])
      setIsLoading(false)
    }
    initialize()
  }, [loadCanvas, loadMessages, getWebSocketUrls])

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

  // WebSocket connections
  const { sendMessage: sendPixelUpdate } = useWebSocket(pixelChannelUrl, handlePixelUpdate)
  const { sendMessage: sendChatMessage } = useWebSocket(chatChannelUrl, handleChatMessage)

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
    
    sendPixelUpdate(pixelData)
  }, [sendPixelUpdate])

  // Send a chat message
  const sendMessage = useCallback((message, userId = 'user1', username = 'User') => {
    const messageData = {
      message,
      userId,
      username,
      room: ROOM
    }
    sendChatMessage(messageData)
  }, [sendChatMessage])

  return {
    pixels,
    messages,
    placePixel,
    sendMessage,
    isLoading,
    room: ROOM
  }
}
