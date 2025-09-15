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
      const response = await fetch(`${API_BASE}/getCanvas?room=${ROOM}`)
      if (response.ok) {
        const canvasData = await response.json()
        // Convert 2D array to pixels object
        const pixelsObj = {}
        canvasData.forEach((row, y) => {
          row.forEach((color, x) => {
            if (color !== '#ffffff') { // Only store non-white pixels
              pixelsObj[`${x},${y}`] = color
            }
          })
        })
        setPixels(pixelsObj)
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
        
        // Convert relative URLs to full WebSocket URLs
        const baseUrl = API_BASE.replace('/api', '/api/ws').replace('http', 'ws')
        setPixelChannelUrl(`${baseUrl}${pixelUrl}`)
        setChatChannelUrl(`${baseUrl}${chatUrl}`)
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
    const { x, y, color } = data
    setPixels(prev => ({
      ...prev,
      [`${x},${y}`]: color
    }))
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
