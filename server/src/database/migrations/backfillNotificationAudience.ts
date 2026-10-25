import mongoose from 'mongoose'
import { logger } from '../../utils/logger.js'
import { redis } from '../redis.js'

export const runNotificationAudienceMigration = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db
    if (!db) return

    const collection = db.collection('notifications')

    // 1. Seller links or seller operational titles -> audience: 'SELLER'
    const sellerResult = await collection.updateMany(
      {
        $or: [
          { link: { $regex: '^/seller', $options: 'i' } },
          { title: { $regex: 'Shipping', $options: 'i' } },
          { title: { $regex: 'New Paid Order', $options: 'i' } },
          { title: { $regex: 'Delivery Successfully Confirmed', $options: 'i' } },
        ],
        audience: { $ne: 'SELLER' },
      },
      {
        $set: { audience: 'SELLER' },
      },
    )

    // 2. Admin links -> audience: 'ADMIN'
    const adminResult = await collection.updateMany(
      {
        link: { $regex: '^/admin', $options: 'i' },
        audience: { $ne: 'ADMIN' },
      },
      {
        $set: { audience: 'ADMIN' },
      },
    )

    // 3. Any remaining documents without audience -> audience: 'BUYER'
    const buyerResult = await collection.updateMany(
      {
        audience: { $in: [null, undefined] },
      },
      {
        $set: { audience: 'BUYER' },
      },
    )

    if (
      sellerResult.modifiedCount > 0 ||
      adminResult.modifiedCount > 0 ||
      buyerResult.modifiedCount > 0
    ) {
      logger.info('Notification audience migration completed', {
        sellerUpdated: sellerResult.modifiedCount,
        adminUpdated: adminResult.modifiedCount,
        buyerUpdated: buyerResult.modifiedCount,
      })

      // Invalidate Redis notification keys if Redis is connected
      try {
        const notifKeys = await redis.keys('notif:*')
        if (notifKeys.length > 0) {
          await redis.del(...notifKeys)
        }
      } catch {
        // Redis fail-safe
      }
    }
  } catch (err) {
    logger.warn('Notification audience migration error (non-fatal)', { err })
  }
}
