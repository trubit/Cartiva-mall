import { Payment, type IPaymentDocument } from './payment.model.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { refundTransaction as paystackRefund } from './paystack.service.js'
import { PAGINATION } from '../../../../src/shared/constants/index.js'
import type { RefundInput } from '../../../../src/shared/validators/payment.validators.js'

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

// ─── Refund (Paystack only) ───────────────────────────────────────────────────
export const refundPayment = async (input: RefundInput, userId: string) => {
  const order = await Order.findOne({ _id: input.orderId, userId })
  if (!order) throw new AppError('Order not found', 404)

  if (order.paymentStatus !== 'paid') {
    throw new AppError('Only paid orders can be refunded', 400)
  }

  if (!order.paystackReference) {
    throw new AppError('No Paystack payment linked to this order', 400)
  }

  if (input.amount !== undefined && input.amount > order.grandTotal) {
    throw new AppError(`Refund amount exceeds order total of ${order.grandTotal}`, 400)
  }

  return paystackRefund(input.orderId, userId, input.reason, input.amount)
}
