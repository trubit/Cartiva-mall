import { z } from 'zod'

export const addWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
})

export const trackRecentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const dashboardSettingsSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/)
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  language: z.string().max(10).optional(),
})

export type AddWishlistInput = z.infer<typeof addWishlistSchema>
export type TrackRecentInput = z.infer<typeof trackRecentSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type DashboardSettingsInput = z.infer<typeof dashboardSettingsSchema>
