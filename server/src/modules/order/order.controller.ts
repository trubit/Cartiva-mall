import type { Request, Response, NextFunction } from 'express'
import * as orderService from './order.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import type { CreateOrderInput } from '../../../../src/shared/validators/payment.validators.js'
import type {
  CancelOrderInput,
  UpdateOrderStatusInput,
  ReturnRequestInput,
  UpdateReturnStatusInput,
} from '../../../../src/shared/validators/order.validators.js'
import { PAGINATION } from '../../../../src/shared/constants/index.js'
import { env } from '../../config/env.js'

const parsePage = (v: unknown) => Math.max(1, parseInt(String(v || '1'), 10))
const parseLimit = (v: unknown) =>
  Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(v || String(PAGINATION.DEFAULT_LIMIT)), 10)),
  )

// ─── Create order ─────────────────────────────────────────────────────────────
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) ||
      (req.headers['idempotency-key'] as string) ||
      req.body.idempotencyKey
    const { order } = await orderService.createOrder(req.user!.userId, {
      ...(req.body as CreateOrderInput),
      idempotencyKey,
    })
    sendCreated(
      res,
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.grandTotal,
        currency: order.currency || env.PAYSTACK_CURRENCY,
      },
      'Order created — proceed to payment',
    )
  } catch (err) {
    next(err)
  }
}

// ─── My orders ────────────────────────────────────────────────────────────────
export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>
    const page = parsePage(req.query['page'])
    const limit = parseLimit(req.query['limit'])

    const { orders, total } = await orderService.getUserOrders(req.user!.userId, {
      status,
      page,
      limit,
    })
    sendSuccess(res, orders, 'Orders fetched', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Single order ─────────────────────────────────────────────────────────────
export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.getOrderById(req.params['id'] as string, req.user!.userId)
    sendSuccess(res, order)
  } catch (err) {
    next(err)
  }
}

// ─── Get order by orderNumber ─────────────────────────────────────────────────
export const getOrderByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getOrderByNumber(
      req.params['orderNumber'] as string,
      req.user!.userId,
    )
    sendSuccess(res, order)
  } catch (err) {
    next(err)
  }
}

// ─── Order history timeline ───────────────────────────────────────────────────
export const getOrderHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getOrderById(req.params['id'] as string, req.user!.userId)
    sendSuccess(res, order.history || [], 'Order history fetched')
  } catch (err) {
    next(err)
  }
}

// ─── Order items ──────────────────────────────────────────────────────────────
export const getOrderItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getOrderById(req.params['id'] as string, req.user!.userId)
    sendSuccess(res, order.items, 'Order items fetched')
  } catch (err) {
    next(err)
  }
}

// ─── Tracking info ────────────────────────────────────────────────────────────
export const trackOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getOrderById(req.params['id'] as string, req.user!.userId)
    sendSuccess(
      res,
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        shippingMethod: order.shippingMethod,
        tracking: order.tracking ?? { events: [] },
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      'Tracking info',
    )
  } catch (err) {
    next(err)
  }
}

// ─── Cancel order ─────────────────────────────────────────────────────────────
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.cancelOrder(
      req.params['id'] as string,
      req.user!.userId,
      req.body as CancelOrderInput,
    )
    sendSuccess(res, order, 'Order cancelled successfully')
  } catch (err) {
    next(err)
  }
}

// ─── Update order status (seller / admin) ────────────────────────────────────
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      req.body as UpdateOrderStatusInput,
    )
    sendSuccess(res, order, 'Order status updated')
  } catch (err) {
    next(err)
  }
}

// ─── Request return ───────────────────────────────────────────────────────────
export const requestReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.requestReturn(
      req.params['id'] as string,
      req.user!.userId,
      req.body as ReturnRequestInput,
    )
    sendSuccess(res, order, 'Return request submitted successfully')
  } catch (err) {
    next(err)
  }
}

// ─── Admin: update return request status ─────────────────────────────────────
export const updateReturnStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.updateReturnStatus(
      req.params['id'] as string,
      req.body as UpdateReturnStatusInput,
    )
    sendSuccess(res, order, 'Return status updated')
  } catch (err) {
    next(err)
  }
}

// ─── Seller orders ────────────────────────────────────────────────────────────
export const getSellerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>
    const page = parsePage(req.query['page'])
    const limit = parseLimit(req.query['limit'])

    const { orders, total } = await orderService.getSellerOrders(req.user!.userId, {
      status,
      page,
      limit,
    })
    sendSuccess(res, orders, 'Seller orders fetched', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Admin orders ─────────────────────────────────────────────────────────────
export const getAdminOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, paymentStatus, search } = req.query as Record<string, string>
    const page = parsePage(req.query['page'])
    const limit = parseLimit(req.query['limit'])

    const { orders, total } = await orderService.getAdminOrders({
      status,
      paymentStatus,
      search,
      page,
      limit,
    })
    sendSuccess(res, orders, 'Admin orders fetched', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Buyer: Submit Physical Payment Proof ────────────────────────────────────
export const submitPhysicalPaymentProof = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.submitPhysicalPaymentProof(
      req.params['id'] as string,
      req.user!.userId,
      req.body,
    )
    sendSuccess(res, order, 'Payment proof submitted successfully — awaiting admin verification')
  } catch (err) {
    next(err)
  }
}

// ─── Admin: Verify Physical Payment ──────────────────────────────────────────
export const verifyPhysicalPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.verifyPhysicalPayment(
      req.params['id'] as string,
      req.user!.userId,
      req.body,
    )
    sendSuccess(
      res,
      order,
      req.body.decision === 'CONFIRM'
        ? 'Physical payment confirmed and order updated'
        : 'Physical payment rejected',
    )
  } catch (err) {
    next(err)
  }
}

// ─── Admin: Get Pending Physical Payments ────────────────────────────────────
export const getPendingPhysicalPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parsePage(req.query['page'])
    const limit = parseLimit(req.query['limit'])

    const { orders, total } = await orderService.getPendingPhysicalPayments({ page, limit })
    sendSuccess(res, orders, 'Pending physical payments fetched', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    })
  } catch (err) {
    next(err)
  }
}
