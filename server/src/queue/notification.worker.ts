import { Queue, Worker } from 'bullmq'
import { redisConnection } from './connection.js'
import { notificationService } from '../modules/notification/notification.service.js'
import { EmailProvider } from '../modules/notification/providers/emailProvider.js'
import { logger } from '../utils/logger.js'

export const notificationQueue = new Queue('notification-dispatch-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const notificationWorker = new Worker(
  'notification-dispatch-queue',
  async (job) => {
    const { userId, type, title, message, channel, email, link, data } = job.data

    try {
      // 1. Create in-app notification
      await notificationService.create({
        userId,
        type,
        title,
        message,
        channel,
        link,
        data,
      })

      // 2. Dispatch email if channel is EMAIL or if user provided an email
      if (channel === 'EMAIL' || email) {
        await EmailProvider.send({
          to: email,
          subject: title,
          body: `<p>${message}</p>`,
        })
      }
    } catch (err) {
      logger.error('NotificationWorker dispatch failed', { jobId: job.id, error: err })
      throw err
    }
  },
  { connection: redisConnection },
)
