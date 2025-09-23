import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'

const API_BASE = `${window.location.origin}/api` // Use same origin as frontend
const ROOM = 'main' // Default room
const BATCH_INTERVAL = 2000 // 2 seconds in milliseconds
const SOURCE_ID = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Unique client identifier

export const usePixelGame = () => {
  const [pixels, setPixels] = useState({})
  const [messages, setMessages] = useState([])
  const [pixelChannelUrl, setPixelChannelUrl] = useState(null)
  const [chatChannelUrl, setChatChannelUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Pixel batching
  const pixelBatch = useRef([])
  const batchTimeoutRef = useRef(null)
  const processedBatchIds = useRef(new Set())

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
        fetch(`${API_BASE}/getChannelURL?channel=pixelupdates&room=${ROOM}`),
        fetch(`${API_BASE}/getChannelURL?channel=chatmessages&room=${ROOM}`)
      ])

      if (pixelResponse.ok && chatResponse.ok) {
        const pixelUrl = await pixelResponse.text()
        const chatUrl = await chatResponse.text()
        
        console.log('Raw pixel URL from backend:', pixelUrl)
        console.log('Raw chat URL from backend:', chatUrl)
        
        // Construct WebSocket URLs using window.location.origin
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
    }
  }, [])

  // Handle pixel batch updates from WebSocket
  const handlePixelBatchUpdate = useCallback((data) => {
    console.log('Received pixel batch update:', data)
    const { pixels: batchPixels, batchId, timestamp, sourceId } = data
    
    // Ignore messages from this client (self-deduplication)
    if (sourceId === SOURCE_ID) {
      console.log('Ignoring pixel batch from self (sourceId:', sourceId, ')')
      return
    }
    
    // Prevent processing the same batch multiple times
    if (batchId && processedBatchIds.current.has(batchId)) {
      console.log('Ignoring duplicate batch with ID:', batchId)
      return
    }
    
    if (Array.isArray(batchPixels)) {
      setPixels(prev => {
        const newPixels = { ...prev }
        batchPixels.forEach(pixel => {
          const { x, y, color } = pixel
          newPixels[`${x},${y}`] = color
        })
        console.log('Updated pixels from batch:', newPixels)
        return newPixels
      })
      
      // Mark this batch as processed
      if (batchId) {
        processedBatchIds.current.add(batchId)
        
        // Clean up old batch IDs to prevent memory leaks (keep only last 100)
        if (processedBatchIds.current.size > 100) {
          const idsArray = Array.from(processedBatchIds.current)
          processedBatchIds.current.clear()
          // Keep the most recent 50 batch IDs
          idsArray.slice(-50).forEach(id => processedBatchIds.current.add(id))
        }
      }
    }
  }, [])

  // Handle chat messages from WebSocket
  const handleChatMessage = useCallback((data) => {
    // Ignore messages from this client (self-deduplication)
    if (data.sourceId === SOURCE_ID) {
      console.log('Ignoring chat message from self (sourceId:', data.sourceId, ')')
      return
    }
    setMessages(prev => {
      const newMessages = [...prev, data]
      // Keep only last 100 messages (frontend limit)
      return newMessages.length > 100 ? newMessages.slice(-100) : newMessages
    })
  }, [])

  // WebSocket connections
  const { sendMessage: sendPixelUpdate, isConnected: pixelConnected, error: pixelError, reconnect: reconnectPixel } = useWebSocket(pixelChannelUrl, handlePixelBatchUpdate)
  const { sendMessage: sendChatMessage, isConnected: chatConnected, error: chatError, reconnect: reconnectChat } = useWebSocket(chatChannelUrl, handleChatMessage)

  // Send pixel batch directly to pub/sub for broadcasting
  const sendPixelBatch = useCallback(() => {
    if (pixelBatch.current.length > 0 && sendPixelUpdate) {
      const timestamp = Date.now()
      const batchData = {
        pixels: [...pixelBatch.current],
        room: ROOM,
        timestamp: timestamp,
        batchId: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`, // Unique batch ID
        sourceId: SOURCE_ID // Client identifier for self-deduplication
      }
      console.log('Sending pixel batch directly to pub/sub:', batchData)
      sendPixelUpdate(batchData)
      pixelBatch.current = [] // Clear the batch
    }
  }, [sendPixelUpdate])

  // Schedule batch sending
  const scheduleBatchSend = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }
    batchTimeoutRef.current = setTimeout(() => {
      sendPixelBatch()
    }, BATCH_INTERVAL)
  }, [sendPixelBatch])

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
    // Optimistic update - update the pixel immediately in the frontend
    setPixels(prev => {
      const newPixels = {
        ...prev,
        [`${x},${y}`]: color
      }
      return newPixels
    })
    
    // Add pixel to batch instead of sending immediately
    pixelBatch.current.push(pixelData)
    console.log('Added pixel to batch. Batch size:', pixelBatch.current.length)
    
    // Schedule batch send (this will reset the timer if called multiple times)
    scheduleBatchSend()
  }, [scheduleBatchSend])

  // Send a chat message directly to pub/sub for broadcasting
  const sendMessage = useCallback((message, userId = 'user1', username = 'User') => {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = Math.floor(Date.now() / 1000)
    const messageData = {
      messageId: messageId,
      userId,
      username,
      message,
      timestamp: timestamp,
      room: ROOM,
      sourceId: SOURCE_ID // Client identifier for self-deduplication
    }
    
    console.log('Sending chat message:', messageData)
    
    // Optimistic update - add message immediately to frontend
    const chatMessage = {
      id: messageId,
      userId,
      username,
      message,
      timestamp: timestamp
    }
    setMessages(prev => [...prev, chatMessage])
    
    // Send message directly via WebSocket
    sendChatMessage(messageData)
  }, [sendChatMessage])

  // Clear functions
  const clearCanvas = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/clearData?type=canvas&room=${ROOM}`)
      if (response.ok) {
        setPixels({})
        console.log('Canvas cleared successfully')
      } else {
        console.error('Failed to clear canvas:', response.status)
      }
    } catch (error) {
      console.error('Error clearing canvas:', error)
    }
  }, [])

  const clearChat = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/clearData?type=chat&room=${ROOM}`)
      if (response.ok) {
        setMessages([])
        console.log('Chat cleared successfully')
      } else {
        console.error('Failed to clear chat:', response.status)
      }
    } catch (error) {
      console.error('Error clearing chat:', error)
    }
  }, [])

  return {
    pixels,
    messages,
    placePixel,
    sendMessage,
    clearCanvas,
    clearChat,
    isLoading,
    room: ROOM,
    // WebSocket connection status
    pixelConnected,
    chatConnected,
    pixelError,
    chatError,
    reconnectPixel,
    reconnectChat
  }
}
