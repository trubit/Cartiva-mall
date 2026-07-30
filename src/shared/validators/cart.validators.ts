import { z } from 'zod'

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  quantity: z.number().int().min(1).max(100).default(1),
  selectedVariant: z.string().max(100).optional(),
  selectedSize: z.string().max(50).optional(),
  selectedColor: z.string().max(50).optional(),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(100),
})

export const syncCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .max(50),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type SyncCartInput = z.infer<typeof syncCartSchema>
