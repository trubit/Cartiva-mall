import { Queue, Worker } from 'bullmq'
import { redisConnection } from './connection.js'
import { processExpiredReservations } from '../modules/inventory/inventory.service.js'
import { logger } from '../utils/logger.js'

export const inventoryExpiryQueue = new Queue('inventory-expiry-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const inventoryExpiryWorker = new Worker(
  'inventory-expiry-queue',
  async () => {
    try {
      const expiredCount = await processExpiredReservations()
      if (expiredCount > 0) {
        logger.info(`InventoryExpiryWorker: Released ${expiredCount} expired stock reservations`)
      }
    } catch (err) {
      logger.error('InventoryExpiryWorker error', { error: err })
      throw err
    }
  },
  { connection: redisConnection },
)
