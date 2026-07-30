import { z } from 'zod'

export const createOrderSchema = z.object({
  checkoutSessionId: z.string().min(1, 'Checkout session ID is required'),
  notes: z.string().max(500).optional(),
})

export const refundSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  reason: z.string().max(500).optional(),
  amount: z.number().positive('Refund amount must be positive').optional(),
})

export const paymentStatusSchema = z.object({
  paymentIntentId: z.string().min(1),
})

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'paymentIntentId is required'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type RefundInput = z.infer<typeof refundSchema>
// amount is in order currency units (e.g. USD dollars, not cents)
export type PaymentStatusInput = z.infer<typeof paymentStatusSchema>
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>
