import { z } from 'zod'

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only')
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dateOfBirth: z.string().optional(),
  language: z.string().max(10).optional(),
})

export const updateAddressSchema = z.object({
  country: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  street: z.string().max(200).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
})

export const updateNotificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  newsletter: z.boolean().optional(),
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to delete account'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
