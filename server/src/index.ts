import { createServer } from 'http'
import mongoose from 'mongoose'
import app from './app.js'
import { connectMongoDB } from './database/mongodb.js'
import { connectRedis, redis } from './database/redis.js'
import { initSockets } from './sockets/index.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { verifyEmailConfig } from './utils/email.js'
import { flushViewCounters } from './modules/product/product.service.js'
import { User } from './modules/user/user.model.js'
import { seedDefaultPermissions } from './modules/iam/iam.service.js'
import { seedDefaultAccounts } from './modules/finance/finance.service.js'
import { startWorkflowWorker, stopWorkflowWorker } from './queue/workflow.queue.js'
import { startIamWorker, stopIamWorker } from './queue/iam.queue.js'
import { startWebhookWorker, stopWebhookWorker } from './queue/webhook.queue.js'
import { startEventBusWorker, stopEventBusWorker } from './queue/eventBus.queue.js'
import { startGodModeWorker, stopGodModeWorker } from './queue/godmode.queue.js'

// ─── Unhandled error safety net ───────────────────────────────────────────────
// Must be registered before any async work so crashes don't swallow silently.
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { error: err.message, stack: err.stack })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  // Log but do NOT exit — fire-and-forget operations (audit logs, notifications)
  // can reject without the whole server needing to die.
  logger.error('Unhandled promise rejection', { reason })
})

const ensureAdmin = async (): Promise<void> => {
  const email = env.ADMIN_EMAIL
  if (!email) return
  try {
    const result = await User.findOneAndUpdate(
      { email },
      { $set: { role: 'admin', isActive: true, emailVerified: true } },
    )
    if (result) logger.info(`Admin role confirmed for ${email}`)
  } catch {
    logger.warn(`ensureAdmin: could not update ${email} — user may not exist yet`)
  }
}

const bootstrap = async (): Promise<void> => {
  const httpServer = createServer(app)

  // 30-second hard timeout on all HTTP connections.
  // Prevents hung Stripe/Cloudinary/Brevo calls from holding sockets forever.
  httpServer.timeout = 30_000

  initSockets(httpServer)

  // Flush Redis view counters to MongoDB every 60 seconds
  const viewsFlushTimer = setInterval(() => {
    flushViewCounters().catch(() => {})
  }, 60_000)

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Stop the other process and try again.`)
    } else {
      logger.error('Server error', { error: err.message })
    }
    process.exit(1)
  })

  httpServer.listen(env.PORT, () => {
    logger.info(`Cartiva API running on http://localhost:${env.PORT}`)
    logger.info(`Environment: ${env.NODE_ENV}`)
  })

  await connectMongoDB()
  await connectRedis()
  await ensureAdmin()
  seedDefaultPermissions().catch(() => {})
  seedDefaultAccounts().catch(() => {})
  startWorkflowWorker()
  startIamWorker()
  startWebhookWorker()
  startEventBusWorker()
  startGodModeWorker().catch(() => {})
  verifyEmailConfig() // non-blocking — logs result when ready

  // ─── Graceful shutdown ──────────────────────────────────────────────────────
  // Called on SIGTERM (container stop / rolling deploy) and SIGINT (Ctrl+C).
  // Stops accepting new connections, waits for in-flight requests to finish,
  // then closes DB connections cleanly so no writes are abandoned.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)

    clearInterval(viewsFlushTimer)

    // Flush any remaining view counts before exit
    flushViewCounters().catch(() => {})

    httpServer.close(async () => {
      try {
        await mongoose.connection.close()
        logger.info('MongoDB connection closed')
        await stopWorkflowWorker()
        await stopIamWorker()
        await stopWebhookWorker()
        await stopEventBusWorker()
        await stopGodModeWorker()
        await redis.quit()
        logger.info('Redis connection closed')
        logger.info('Graceful shutdown complete')
        process.exit(0)
      } catch (err) {
        logger.error('Error during graceful shutdown', { err })
        process.exit(1)
      }
    })

    // Force-kill if graceful shutdown takes too long (30 s)
    setTimeout(() => {
      logger.error('Graceful shutdown timeout — forcing exit')
      process.exit(1)
    }, 30_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err })
  process.exit(1)
})
