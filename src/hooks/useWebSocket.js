import { useEffect, useRef, useState } from 'react'

export const useWebSocket = (url, onMessage) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = useRef(5)
  const reconnectDelay = useRef(1000) // Start with 1 second

  useEffect(() => {
    if (!url) return

    const connect = () => {
      try {
        // Clear any existing reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        console.log(`Attempting to connect to WebSocket (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts.current}):`, url)
        wsRef.current = new WebSocket(url)
        
        wsRef.current.onopen = () => {
          setIsConnected(true)
          setError(null)
          reconnectAttempts.current = 0 // Reset attempts on successful connection
          reconnectDelay.current = 1000 // Reset delay
          console.log('WebSocket connected successfully:', url)
        }

        wsRef.current.onmessage = async (event) => {
          try {
            console.log('Raw WebSocket message received:', event.data)
            
            // Handle Blob data by converting to text
            let messageData = event.data
            if (event.data instanceof Blob) {
              messageData = await event.data.text()
              console.log('Converted Blob to text:', messageData)
            }
            
            const data = JSON.parse(messageData)
            console.log('Parsed WebSocket data:', data)
            onMessage(data)
          } catch (err) {
            console.error('Error parsing WebSocket message:', err)
            console.error('Raw message data:', event.data)
          }
        }

        wsRef.current.onclose = (event) => {
          setIsConnected(false)
          console.log('WebSocket disconnected:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            url: url
          })

          // Only attempt reconnection if we haven't exceeded max attempts
          if (reconnectAttempts.current < maxReconnectAttempts.current) {
            reconnectAttempts.current++
            console.log(`Scheduling reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts.current} in ${reconnectDelay.current}ms`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, reconnectDelay.current)
            
            // Exponential backoff: increase delay for next attempt
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000) // Max 30 seconds
          } else {
            console.error('WebSocket reconnection failed: Maximum attempts reached')
            setError(new Error('WebSocket connection failed after maximum retry attempts'))
          }
        }

        wsRef.current.onerror = (error) => {
          setError(error)
          console.error('WebSocket error:', {
            error: error,
            url: url,
            readyState: wsRef.current?.readyState
          })
        }
      } catch (err) {
        setError(err)
        console.error('Error creating WebSocket:', err)
      }
    }

    connect()

    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
      }
      
      // Reset reconnection state
      reconnectAttempts.current = 0
      reconnectDelay.current = 1000
    }
  }, [url, onMessage])

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const jsonMessage = JSON.stringify(message)
      console.log('Sending WebSocket message:', jsonMessage)
      wsRef.current.send(jsonMessage)
    } else {
      console.error('WebSocket is not connected')
    }
  }

  const reconnect = () => {
    console.log('Manual reconnection requested')
    reconnectAttempts.current = 0
    reconnectDelay.current = 1000
    setError(null)
    
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    // Trigger reconnection
    if (url) {
      setTimeout(() => {
        const connect = () => {
          try {
            console.log('Manual reconnection attempt:', url)
            wsRef.current = new WebSocket(url)
            
            wsRef.current.onopen = () => {
              setIsConnected(true)
              setError(null)
              console.log('Manual reconnection successful:', url)
            }
            
            wsRef.current.onclose = (event) => {
              setIsConnected(false)
              console.log('Manual reconnection failed:', event.code, event.reason)
            }
            
            wsRef.current.onerror = (error) => {
              setError(error)
              console.error('Manual reconnection error:', error)
            }
            
            wsRef.current.onmessage = async (event) => {
              try {
                let messageData = event.data
                if (event.data instanceof Blob) {
                  messageData = await event.data.text()
                }
                const data = JSON.parse(messageData)
                onMessage(data)
              } catch (err) {
                console.error('Error parsing WebSocket message:', err)
              }
            }
          } catch (err) {
            setError(err)
            console.error('Error in manual reconnection:', err)
          }
        }
        connect()
      }, 100)
    }
  }

  return { isConnected, error, sendMessage, reconnect }
}
