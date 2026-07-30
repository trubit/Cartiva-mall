import { z } from 'zod'
import { PRODUCT_CATEGORIES } from '../constants/index.js'

export const createProductSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  images: z.array(z.string()).optional().default([]),
  category: z.enum([...PRODUCT_CATEGORIES]),
  subCategory: z.string().optional(),
  brand: z.string().optional(),
  stockQuantity: z.number().int().min(0),
  sku: z.string().min(1).max(50),
  tags: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
})

export const updateProductSchema = createProductSchema.partial()

export const productFiltersSchema = z.object({
  category: z.string().optional(),
  brand: z.string().max(100).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  sellerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z
    .enum(['newest', 'price_asc', 'price_desc', 'rating', 'popular'])
    .optional()
    .default('newest'),
})

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
