import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const connectMongoDB = async (): Promise<void> => {
  // Fail fast during outages — don't silently queue operations
  mongoose.set('bufferCommands', false)
  // 10 s default query timeout — prevents runaway aggregations from exhausting the connection pool
  mongoose.set('maxTimeMS', 10_000)

  try {
    // Hard 15 s timeout around mongoose.connect().
    // Mongoose 9.x can hang well beyond serverSelectionTimeoutMS when the
    // MongoDB server is reachable at the TCP level but unresponsive to the
    // driver protocol handshake.  This guarantees startup continues.
    const connectPromise = mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 100,
      minPoolSize: 10,
      socketTimeoutMS: 45_000,
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
      heartbeatFrequencyMS: 10_000,
      maxIdleTimeMS: 60_000,
    })

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error('MongoDB connection timed out after 15 s')), 15_000)
    })

    await Promise.race([connectPromise, timeoutPromise])
    logger.info('MongoDB connected successfully')

    // Run self-healing background migrations
    import('./migrations/backfillNotificationAudience.js')
      .then((m) => m.runNotificationAudienceMigration())
      .catch((migrationErr) => {
        logger.warn('Failed to run notification audience migration', { migrationErr })
      })
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err })
    // In production, crash hard so the orchestrator can restart the container.
    // In dev mode, keep the server alive — the /health endpoint reports
    // mongodb: 'unavailable' and tsx watch can retry on the next file save.
    if (env.NODE_ENV === 'production') {
      process.exit(1)
    }
    logger.warn('Server running WITHOUT MongoDB — most routes will fail until DB is available')
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'))
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err }))
}
