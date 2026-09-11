import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null
let currentToken: string | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socket.on('connect', () => {
      if (currentToken) {
        socket?.emit('join:user', currentToken)
      }
    })

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => {
        if (socket?.connected) {
          socket.disconnect()
        }
      })

      window.addEventListener('online', () => {
        if (socket && !socket.connected && currentToken) {
          socket.connect()
        }
      })
    }
  }
  return socket
}

// Server verifies the access token and extracts userId to join the correct room.
// Never pass userId directly — the server must validate identity via JWT.
export const connectSocket = (accessToken: string): void => {
  currentToken = accessToken
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  } else {
    s.emit('join:user', accessToken)
  }
}

export const disconnectSocket = (): void => {
  currentToken = null
  if (socket?.connected) {
    socket.disconnect()
  }
}
