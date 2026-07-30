import { z } from 'zod'

const addressSchema = z.object({
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  street: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
})

export const onboardSellerSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  storeDescription: z.string().max(1000).optional().default(''),
  storeAddress: addressSchema.optional(),
})

export const updateSellerProfileSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  storeDescription: z.string().max(1000).optional(),
  storeLogo: z.string().url().optional().or(z.literal('')),
  storeAddress: addressSchema.optional(),
})

export const sellerAnalyticsQuerySchema = z.object({
  days: z.coerce.number().min(7).max(365).optional().default(30),
})

export type OnboardSellerInput = z.infer<typeof onboardSellerSchema>
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>
export type SellerAnalyticsQueryInput = z.infer<typeof sellerAnalyticsQuerySchema>
