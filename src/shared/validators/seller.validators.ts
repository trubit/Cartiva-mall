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
  whatsappNumber: z.string().max(30).optional(),
  publicLocation: z.string().max(200).optional(),
})

export const sellerAnalyticsQuerySchema = z.object({
  days: z.coerce.number().min(7).max(365).optional().default(30),
})

export const requestWithdrawalSchema = z.object({
  amount: z.coerce
    .number()
    .positive('Withdrawal amount must be greater than 0')
    .min(1, 'Minimum withdrawal amount is 1'),
  payoutAccountId: z.string().min(1, 'Payout account ID is required'),
  idempotencyKey: z.string().max(100).optional(),
})

export const addPayoutAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required').max(100),
  bankCode: z.string().min(1, 'Bank code is required').max(20),
  accountNumber: z
    .string()
    .min(10, 'Account number must be at least 10 digits')
    .max(20, 'Account number cannot exceed 20 characters')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  accountName: z.string().min(2, 'Account name is required').max(150),
  currency: z.string().max(10).optional().default('NGN'),
  isDefault: z.boolean().optional().default(false),
})

export const resolveAccountSchema = z.object({
  accountNumber: z.string().min(10, 'Account number is required'),
  bankCode: z.string().min(1, 'Bank code is required'),
})

export const withdrawalHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'])
    .optional(),
})

export const submitKycSchema = z.object({
  businessType: z.enum(['individual', 'registered_business', 'company']).default('individual'),
  legalName: z.string().min(2, 'Legal name must be at least 2 characters').max(150),
  idType: z.enum(['bvn', 'nin', 'passport', 'drivers_license', 'voters_card']),
  idNumber: z.string().min(4, 'ID number must be at least 4 characters').max(50),
  idDocumentUrl: z.string().url().optional().or(z.literal('')),
  proofOfAddressUrl: z.string().url().optional().or(z.literal('')),
  storeAddress: addressSchema.optional(),
  bankDetails: z.object({
    bankCode: z.string().min(1, 'Bank code is required'),
    bankName: z.string().min(2, 'Bank name is required'),
    accountNumber: z.string().min(10, 'Account number must be at least 10 digits').regex(/^\d+$/),
    accountName: z.string().min(2, 'Account name is required'),
  }),
})

export const createStoreSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  storeDescription: z.string().max(1000).optional().default(''),
  storeCategory: z.string().max(100).optional().default('General'),
  storeLogo: z.string().url().optional().or(z.literal('')),
  storeAddress: addressSchema.optional(),
  whatsappNumber: z.string().max(30).optional(),
})

export const adminReviewKycSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_ACTION']),
  rejectionReason: z.string().max(500).optional(),
  actionRequiredReason: z.string().max(500).optional(),
})

export type OnboardSellerInput = z.infer<typeof onboardSellerSchema>
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>
export type SellerAnalyticsQueryInput = z.infer<typeof sellerAnalyticsQuerySchema>
export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>
export type AddPayoutAccountInput = z.infer<typeof addPayoutAccountSchema>
export type ResolveAccountInput = z.infer<typeof resolveAccountSchema>
export type WithdrawalHistoryQueryInput = z.infer<typeof withdrawalHistoryQuerySchema>
export type SubmitKycInput = z.infer<typeof submitKycSchema>
export type CreateStoreInput = z.infer<typeof createStoreSchema>
export type AdminReviewKycInput = z.infer<typeof adminReviewKycSchema>
