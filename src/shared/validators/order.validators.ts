import { z } from 'zod'
import { ORDER_STATUS, RETURN_REASONS } from '../constants/index.js'

// All valid status values as a readonly tuple Zod can use
const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS) as [string, ...string[]]

// ─── Cancel order ─────────────────────────────────────────────────────────────
export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─── Update order status (seller / admin) ────────────────────────────────────
export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(ORDER_STATUS_VALUES as [string, ...string[]]),
  tracking: z
    .object({
      trackingNumber: z.string().max(100).optional(),
      carrier: z.string().max(100).optional(),
      trackingUrl: z.string().url({ message: 'Invalid tracking URL' }).optional(),
      estimatedDeliveryDate: z.string().datetime({ offset: true }).optional(),
      location: z.string().max(200).optional(),
      note: z.string().max(300).optional(),
    })
    .optional(),
})

// ─── Return request ───────────────────────────────────────────────────────────
export const returnRequestSchema = z.object({
  reason: z.enum(RETURN_REASONS),
  description: z.string().min(10, 'Please describe the issue (min 10 chars)').max(1000).optional(),
})

// ─── Update return status (admin) ────────────────────────────────────────────
export const updateReturnStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'completed']),
  refundAmount: z.number().positive().optional(),
  note: z.string().max(500).optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type ReturnRequestInput = z.infer<typeof returnRequestSchema>
export type UpdateReturnStatusInput = z.infer<typeof updateReturnStatusSchema>
