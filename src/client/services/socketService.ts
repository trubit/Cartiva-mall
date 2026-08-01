import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

// Server verifies the access token and extracts userId to join the correct room.
// Never pass userId directly — the server must validate identity via JWT.
export const connectSocket = (accessToken: string): void => {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit('join:user', accessToken)
}

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect()
  }
}
