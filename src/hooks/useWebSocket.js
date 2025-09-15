import { useEffect, useRef, useState } from 'react'

export const useWebSocket = (url, onMessage) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!url) return

    const connect = () => {
      try {
        wsRef.current = new WebSocket(url)
        
        wsRef.current.onopen = () => {
          setIsConnected(true)
          setError(null)
          console.log('WebSocket connected:', url)
        }

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            onMessage(data)
          } catch (err) {
            console.error('Error parsing WebSocket message:', err)
          }
        }

        wsRef.current.onclose = () => {
          setIsConnected(false)
          console.log('WebSocket disconnected')
          // Attempt to reconnect after 3 seconds
          setTimeout(connect, 3000)
        }

        wsRef.current.onerror = (error) => {
          setError(error)
          console.error('WebSocket error:', error)
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
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  return { isConnected, error, sendMessage }
}
