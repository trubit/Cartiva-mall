import { describe, it, expect } from 'vitest'
import {
  createProductSchema,
  productFiltersSchema,
  reviewSchema,
} from '../../validators/product.validators.js'
import { PRODUCT_CATEGORIES } from '../../constants/index.js'

describe('createProductSchema', () => {
  const validProduct = {
    title: 'Wireless Headphones Pro',
    description: 'High-fidelity wireless headphones with noise cancellation.',
    price: 149.99,
    category: PRODUCT_CATEGORIES[0],
    stockQuantity: 50,
    sku: 'WHP-001',
  }

  it('accepts a fully valid product', () => {
    expect(createProductSchema.safeParse(validProduct).success).toBe(true)
  })

  it('rejects title shorter than 2 characters', () => {
    const result = createProductSchema.safeParse({ ...validProduct, title: 'A' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('title')
  })

  it('rejects description shorter than 10 characters', () => {
    const result = createProductSchema.safeParse({ ...validProduct, description: 'Short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('description')
  })

  it('rejects non-positive price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, price: 0 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('price')
  })

  it('rejects negative price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, price: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects negative stockQuantity', () => {
    const result = createProductSchema.safeParse({ ...validProduct, stockQuantity: -1 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('stockQuantity')
  })

  it('accepts zero stockQuantity (out of stock)', () => {
    const result = createProductSchema.safeParse({ ...validProduct, stockQuantity: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects category not in PRODUCT_CATEGORIES', () => {
    const result = createProductSchema.safeParse({ ...validProduct, category: 'Unknown Category' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('category')
  })

  it('accepts all valid PRODUCT_CATEGORIES', () => {
    for (const category of PRODUCT_CATEGORIES) {
      const result = createProductSchema.safeParse({ ...validProduct, category })
      expect(result.success, `Category "${category}" should be valid`).toBe(true)
    }
  })

  it('defaults images to empty array when omitted', () => {
    const result = createProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
    expect(result.data?.images).toEqual([])
  })

  it('defaults isFeatured to false when omitted', () => {
    const result = createProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
    expect(result.data?.isFeatured).toBe(false)
  })

  it('accepts optional discountPrice', () => {
    const result = createProductSchema.safeParse({ ...validProduct, discountPrice: 99.99 })
    expect(result.success).toBe(true)
  })

  it('rejects non-positive discountPrice', () => {
    const result = createProductSchema.safeParse({ ...validProduct, discountPrice: 0 })
    expect(result.success).toBe(false)
  })
})

describe('productFiltersSchema', () => {
  it('accepts empty object — all fields optional', () => {
    expect(productFiltersSchema.safeParse({}).success).toBe(true)
  })

  it('defaults page to 1', () => {
    const result = productFiltersSchema.safeParse({})
    expect(result.data?.page).toBe(1)
  })

  it('defaults limit to 20', () => {
    const result = productFiltersSchema.safeParse({})
    expect(result.data?.limit).toBe(20)
  })

  it('coerces string page to number', () => {
    const result = productFiltersSchema.safeParse({ page: '3' })
    expect(result.success).toBe(true)
    expect(result.data?.page).toBe(3)
  })

  it('coerces string limit to number', () => {
    const result = productFiltersSchema.safeParse({ limit: '50' })
    expect(result.success).toBe(true)
    expect(result.data?.limit).toBe(50)
  })

  it('rejects limit above 100', () => {
    expect(productFiltersSchema.safeParse({ limit: '101' }).success).toBe(false)
  })

  it('rejects page below 1', () => {
    expect(productFiltersSchema.safeParse({ page: '0' }).success).toBe(false)
  })

  it('accepts valid sort values', () => {
    const sorts = ['newest', 'price_asc', 'price_desc', 'rating', 'popular'] as const
    for (const sort of sorts) {
      expect(
        productFiltersSchema.safeParse({ sort }).success,
        `sort "${sort}" should be valid`,
      ).toBe(true)
    }
  })

  it('rejects unknown sort value', () => {
    expect(productFiltersSchema.safeParse({ sort: 'unknown' }).success).toBe(false)
  })

  it('coerces inStock string to boolean', () => {
    const result = productFiltersSchema.safeParse({ inStock: 'true' })
    expect(result.success).toBe(true)
    expect(result.data?.inStock).toBe(true)
  })
})

describe('reviewSchema', () => {
  it('accepts valid review with title', () => {
    const result = reviewSchema.safeParse({
      rating: 5,
      title: 'Excellent product',
      body: 'Really loved this product, would buy again.',
    })
    expect(result.success).toBe(true)
  })

  it('accepts review without title', () => {
    const result = reviewSchema.safeParse({ rating: 3, body: 'It was okay, nothing special.' })
    expect(result.success).toBe(true)
  })

  it('rejects rating below 1', () => {
    const result = reviewSchema.safeParse({ rating: 0, body: 'Terrible product.' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('rating')
  })

  it('rejects rating above 5', () => {
    const result = reviewSchema.safeParse({ rating: 6, body: 'Too amazing!' })
    expect(result.success).toBe(false)
  })

  it('rejects body shorter than 10 characters', () => {
    const result = reviewSchema.safeParse({ rating: 4, body: 'Great' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('body')
  })

  it('rejects non-integer rating', () => {
    const result = reviewSchema.safeParse({ rating: 4.5, body: 'Pretty good product.' })
    expect(result.success).toBe(false)
  })
})
