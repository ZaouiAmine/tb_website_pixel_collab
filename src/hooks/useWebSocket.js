import { useEffect, useRef, useState } from 'react'

export const useWebSocket = (url, onMessage) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!url) return

    const connect = () => {
      try {
        console.log('Attempting to connect to WebSocket:', url)
        wsRef.current = new WebSocket(url)
        
        wsRef.current.onopen = () => {
          setIsConnected(true)
          setError(null)
          console.log('WebSocket connected successfully:', url)
        }

        wsRef.current.onmessage = (event) => {
          try {
            console.log('Raw WebSocket message received:', event.data)
            const data = JSON.parse(event.data)
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
          // Attempt to reconnect after 3 seconds
          setTimeout(connect, 3000)
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
      if (wsRef.current) {
        wsRef.current.close()
      }
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

  return { isConnected, error, sendMessage }
}
