import mongoose from 'mongoose'
import { logger } from './logger.js'

const STANDALONE_PATTERNS = [
  'Transaction numbers are only allowed on a replica set member or mongos',
  'does not support retryable writes',
  'This MongoDB deployment does not support',
]

function isTransactionUnsupported(err: unknown): boolean {
  return (
    err instanceof Error &&
    STANDALONE_PATTERNS.some((p) => err.message.includes(p))
  )
}

/**
 * Runs `fn` inside a MongoDB session+transaction when the server supports it
 * (replica set / Atlas / sharded cluster). On a standalone node (local dev)
 * it falls back to sequential writes without a session and logs a warning.
 *
 * `sess` is a live ClientSession inside a transaction, or `undefined` on
 * standalone fallback. Pass it to each write operation as:
 *   Model.create([doc], sess ? { session: sess } : undefined)
 *   Model.findOneAndUpdate(filter, update, sess ? { session: sess } : undefined)
 */
export async function withDbTransaction<T>(
  fn: (sess: mongoose.ClientSession | undefined) => Promise<T>,
): Promise<T> {
  const dbSession = await mongoose.startSession()
  try {
    let result!: T
    await dbSession.withTransaction(async () => {
      result = await fn(dbSession)
    })
    return result
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      logger.warn(
        'MongoDB standalone detected — transactions unavailable. ' +
          'Running writes sequentially without atomicity. ' +
          'Use a replica set or MongoDB Atlas in production.',
      )
      return fn(undefined)
    }
    throw err
  } finally {
    await dbSession.endSession()
  }
}
