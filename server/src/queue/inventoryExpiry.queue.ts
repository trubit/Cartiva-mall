import { Queue, Worker } from 'bullmq'
import { redisConnection } from './connection.js'
import { processExpiredReservations } from '../modules/inventory/inventory.service.js'
import { logger } from '../utils/logger.js'

let inventoryExpiryQueueInstance: Queue | null = null
let inventoryExpiryWorkerInstance: Worker | null = null
let bullmqAvailable = true

export const getInventoryExpiryQueue = (): Queue | null => {
  if (!bullmqAvailable) return null
  if (!inventoryExpiryQueueInstance) {
    try {
      inventoryExpiryQueueInstance = new Queue('inventory-expiry-queue', {
        connection: redisConnection,
        skipVersionCheck: true,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      })
    } catch (err: any) {
      bullmqAvailable = false
      logger.warn(`[InventoryExpiry Queue] Failed to initialize: ${err.message}`)
      return null
    }
  }
  return inventoryExpiryQueueInstance
}

export const inventoryExpiryQueue = {
  add: async (name: string, data?: any, opts?: any) => {
    const q = getInventoryExpiryQueue()
    if (!q) {
      throw new Error('InventoryExpiry Queue unavailable')
    }
    return q.add(name, data, opts)
  },
}

export const startInventoryExpiryWorker = (): Worker | null => {
  if (inventoryExpiryWorkerInstance || !bullmqAvailable) return inventoryExpiryWorkerInstance

  try {
    inventoryExpiryWorkerInstance = new Worker(
      'inventory-expiry-queue',
      async () => {
        try {
          const expiredCount = await processExpiredReservations()
          if (expiredCount > 0) {
            logger.info(
              `InventoryExpiryWorker: Released ${expiredCount} expired stock reservations`,
            )
          }
        } catch (err) {
          logger.error('InventoryExpiryWorker error', { error: err })
          throw err
        }
      },
      { connection: redisConnection, skipVersionCheck: true },
    )
    return inventoryExpiryWorkerInstance
  } catch (err: any) {
    bullmqAvailable = false
    logger.warn(`[InventoryExpiry Worker] Failed to start: ${err.message}`)
    return null
  }
}

export const stopInventoryExpiryWorker = async (): Promise<void> => {
  if (inventoryExpiryWorkerInstance) {
    await inventoryExpiryWorkerInstance.close().catch(() => {})
    inventoryExpiryWorkerInstance = null
  }
  if (inventoryExpiryQueueInstance) {
    await inventoryExpiryQueueInstance.close().catch(() => {})
    inventoryExpiryQueueInstance = null
  }
}
