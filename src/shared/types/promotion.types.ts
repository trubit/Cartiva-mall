import type { IProduct } from './product.types.js'

export interface ICoupon {
  _id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number
  maxDiscountAmount: number
  maxUses: number | null
  usedCount: number
  startDate: string | null
  expiresAt: string | null
  applicableCategories: string[]
  applicableProducts: string[]
  isActive: boolean
  createdAt: string
}

export interface IPromotion {
  _id: string
  title: string
  description?: string
  type: 'flash_sale' | 'deal' | 'campaign'
  discountType: 'percentage' | 'fixed'
  discountValue: number
  products: (string | IProduct)[]
  categories: string[]
  startDate: string
  endDate: string
  bannerImage?: string
  badgeLabel?: string
  isActive: boolean
  createdAt: string
}
