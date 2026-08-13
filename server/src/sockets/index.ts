import type { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { redis, redisSub } from '../database/redis.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

import { initEventMonitorSocket } from './eventMonitor.socket.js'

let io: SocketServer | null = null

export const getSocketIO = (): SocketServer => {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

export const initSockets = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Increase ping timeout so mobile clients on slow connections stay connected
    pingTimeout: 60_000,
    pingInterval: 25_000,
  })

  // Initialize event monitor namespace
  initEventMonitorSocket(io)

  // Use Redis adapter so events are routed across all Node.js cluster workers.
  // If Redis is unavailable, the in-process adapter is used as a fallback
  // (works fine for single-process dev, breaks multi-node prod — logged below).
  try {
    io.adapter(createAdapter(redis, redisSub))
    logger.info('Socket.IO using Redis adapter (multi-node ready)')
  } catch (err) {
    logger.warn('Socket.IO Redis adapter failed — falling back to in-process adapter', { err })
  }

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`)

    // Client sends its JWT access token; we verify it before joining the room.
    // This prevents any client from eavesdropping on another user's events.
    socket.on('join:user', (token: unknown) => {
      if (typeof token !== 'string') return

      try {
        const payload = verifyAccessToken(token)
        const userId =
          payload.userId ?? ((payload as unknown as Record<string, unknown>).id as string)
        if (!userId) return

        socket.join(`user:${userId}`)
        // Store userId on socket for leave cleanup
        socket.data.userId = userId
        logger.debug(`Socket ${socket.id} authenticated and joined room user:${userId}`)
      } catch {
        // Invalid or expired token — silently ignore (do not join any room)
        logger.debug(`Socket ${socket.id} sent invalid token for join:user`)
      }
    })

    socket.on('leave:user', () => {
      if (socket.data.userId) {
        socket.leave(`user:${socket.data.userId}`)
      }
    })

    // ── Messaging room management ───────────────────────────────────────────
    socket.on('join:conversation', (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !socket.data.userId) return
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('leave:conversation', (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return
      socket.leave(`conversation:${conversationId}`)
    })

    // Typing indicators — broadcast to conversation room excluding sender
    socket.on('typing:start', (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !socket.data.userId) return
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId: socket.data.userId as string,
        conversationId,
      })
    })

    socket.on('typing:stop', (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !socket.data.userId) return
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId: socket.data.userId as string,
        conversationId,
      })
    })

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}

/** Push a real-time event to a specific user (across all cluster nodes via Redis). */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}
