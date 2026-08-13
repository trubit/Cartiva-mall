import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import * as eventApi from '../services/eventSystemApi.js'

interface EventSystemState {
  events: any[]
  deadLetters: any[]
  sagas: any[]
  health: any | null
  liveStream: any[]
  socketConnected: boolean
  loading: boolean
  error: string | null

  fetchEvents: (params?: any) => Promise<void>
  fetchDeadLetters: (status?: string) => Promise<void>
  fetchSagas: () => Promise<void>
  fetchHealth: () => Promise<void>
  connectLiveStream: () => void
  disconnectLiveStream: () => void
}

let socket: Socket | null = null
const MAX_ATTEMPTS = 5

export const useEventSystemStore = create<EventSystemState>((set) => ({
  events: [],
  deadLetters: [],
  sagas: [],
  health: null,
  liveStream: [],
  socketConnected: false,
  loading: false,
  error: null,

  fetchEvents: async (params) => {
    set({ loading: true, error: null })
    try {
      const res = await eventApi.getEvents(params)
      set({ events: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchDeadLetters: async (status = 'PENDING') => {
    set({ loading: true, error: null })
    try {
      const res = await eventApi.getDeadLetters(status)
      set({ deadLetters: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchSagas: async () => {
    set({ loading: true, error: null })
    try {
      const res = await eventApi.getSagas()
      set({ sagas: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchHealth: async () => {
    try {
      const res = await eventApi.getEventSystemHealth()
      set({ health: res.data })
    } catch {
      // Health check is non-critical — suppress error logging
    }
  },

  connectLiveStream: () => {
    if (socket?.connected) return

    // Clean up any stale disconnected socket before creating a new one
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }

    connectionAttempts = 0

    // IMPORTANT: Start with 'polling' first — this completes the Socket.IO
    // handshake over HTTP before upgrading to WebSocket. Attempting WebSocket
    // first through Vite's dev proxy causes the "closed before established" error
    // because the proxy forwards the WS upgrade before the EIO session is created.
    // The namespace (/events) is part of the URL; the Socket.IO path (/socket.io)
    // is the HTTP endpoint — keep both explicit.
    socket = io(`${window.location.origin}/events`, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: MAX_ATTEMPTS,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
    })

    socket.on('connect', () => {
      connectionAttempts = 0
      set({ socketConnected: true })
    })

    socket.on('domain_event_emitted', (event: any) => {
      set((state) => ({
        liveStream: [event, ...state.liveStream].slice(0, 50),
        events: [event, ...state.events].slice(0, 100),
      }))
    })

    socket.on('connect_error', () => {
      connectionAttempts++
      set({ socketConnected: false })
      // Stop attempting after max retries — stream simply shows as offline
    })

    socket.on('disconnect', (reason) => {
      set({ socketConnected: false })
      // If server disconnected us (not a client-side disconnect), allow reconnect
      if (reason === 'io server disconnect') {
        socket?.connect()
      }
    })
  },

  disconnectLiveStream: () => {
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
      connectionAttempts = 0
      set({ socketConnected: false })
    }
  },
}))
