import { z } from 'zod'

export const checkoutAddressSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  phone: z.string().min(7).max(25).trim(),
  country: z.string().min(2).max(80).trim(),
  state: z.string().min(2).max(80).trim(),
  city: z.string().min(2).max(80).trim(),
  street: z.string().min(5).max(200).trim(),
  postalCode: z.string().min(3).max(20).trim(),
})

export const updateCheckoutSchema = z.object({
  shippingAddress: checkoutAddressSchema,
  billingAddress: checkoutAddressSchema.optional(),
  sameAsShipping: z.boolean().optional().default(true),
})

export const selectShippingSchema = z.object({
  method: z.enum(['standard', 'express', 'sameDay']),
})

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(30).trim().toUpperCase(),
})

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>
export type UpdateCheckoutInput = z.infer<typeof updateCheckoutSchema>
export type SelectShippingInput = z.infer<typeof selectShippingSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>
