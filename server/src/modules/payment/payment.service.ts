import { Payment, type IPaymentDocument } from './payment.model.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { refundTransaction as paystackRefund } from './paystack.service.js'
import { refundStripeTransaction } from './stripe.service.js'
import { PAGINATION } from '../../../../src/shared/constants/index.js'
import type { RefundInput } from '../../../../src/shared/validators/payment.validators.js'
import { env } from '../../config/env.js'

// ─── Available Providers ──────────────────────────────────────────────────────
export const getProviders = () => {
  return {
    paystack: {
      enabled: Boolean(env.PAYSTACK_SECRET_KEY),
      methods: ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr'],
      currencies: [env.PAYSTACK_CURRENCY || 'NGN'],
    },
    stripe: {
      enabled: Boolean(env.STRIPE_SECRET_KEY),
      methods: ['card', 'apple_pay', 'google_pay'],
      currencies: [env.STRIPE_CURRENCY || 'USD'],
    },
  }
}

// ─── Payment history (user-scoped) ───────────────────────────────────────────
export const getPaymentHistory = async (
  userId: string,
  opts?: { page?: number; limit?: number },
): Promise<{ payments: IPaymentDocument[]; total: number }> => {
  const page = Math.max(1, opts?.page ?? PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, opts?.limit ?? PAGINATION.DEFAULT_LIMIT)

  const [payments, total] = await Promise.all([
    Payment.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('orderId', 'orderNumber orderStatus grandTotal')
      .lean(),
    Payment.countDocuments({ userId }),
  ])

  return { payments: payments as IPaymentDocument[], total }
}

// ─── Get Payment Details ──────────────────────────────────────────────────────
export const getPaymentDetails = async (
  paymentId: string,
  userId: string,
): Promise<IPaymentDocument> => {
  const payment = await Payment.findOne({ _id: paymentId, userId })
    .populate('orderId', 'orderNumber orderStatus grandTotal')
    .lean()

  if (!payment) {
    const fallbackByIntent = await Payment.findOne({ paymentIntentId: paymentId, userId })
      .populate('orderId', 'orderNumber orderStatus grandTotal')
      .lean()
    if (!fallbackByIntent) throw new AppError('Payment record not found', 404)
    return fallbackByIntent as unknown as IPaymentDocument
  }

  return payment as unknown as IPaymentDocument
}

// ─── Refund Payment ───────────────────────────────────────────────────────────
export const refundPayment = async (input: RefundInput, userId: string) => {
  const order = await Order.findOne({ _id: input.orderId, userId })
  if (!order) throw new AppError('Order not found', 404)

  if (order.paymentStatus !== 'paid') {
    throw new AppError('Only paid orders can be refunded', 400)
  }

  if (input.amount !== undefined && input.amount > order.grandTotal) {
    throw new AppError(`Refund amount exceeds order total of ${order.grandTotal}`, 400)
  }

  if (order.paymentProvider === 'stripe' || (!order.paystackReference && order.paymentIntentId)) {
    return refundStripeTransaction(input.orderId, userId, input.reason, input.amount)
  }

  if (order.paystackReference) {
    return paystackRefund(input.orderId, userId, input.reason, input.amount)
  }

  throw new AppError('No supported payment provider found for this order refund', 400)
}

// ─── Payment Reconciliation Helper ───────────────────────────────────────────
export const reconcilePaymentState = async (paymentIntentId: string) => {
  const payment = await Payment.findOne({ paymentIntentId })
  if (!payment) return { reconciled: false, reason: 'Payment not found' }

  const order = await Order.findById(payment.orderId)
  if (!order) return { reconciled: false, reason: 'Order not found' }

  let reconciled = false
  if (payment.status === 'completed' && order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid'
    order.orderStatus = 'confirmed'
    await order.save()
    reconciled = true
  }

  return {
    reconciled,
    paymentId: payment._id,
    orderId: order._id,
    paymentStatus: payment.status,
    orderPaymentStatus: order.paymentStatus,
  }
}
