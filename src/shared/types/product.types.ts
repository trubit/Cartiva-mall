import type { ProductCategory } from '../constants/index.js'
import type { IPublicUser } from './user.types.js'

export type ProductStatus = 'pending' | 'active' | 'blocked'

export interface IProduct {
  _id: string
  title: string
  description: string
  price: number
  discountPrice?: number
  discountPercent?: number
  images: string[]
  category: ProductCategory
  subCategory?: string
  brand?: string
  stockQuantity: number
  sku: string
  ratingsAverage: number
  ratingsCount: number
  sellerId: string | IPublicUser
  tags: string[]
  isActive: boolean
  status: ProductStatus
  isFeatured: boolean
  views: number
  createdAt: string
  updatedAt: string
}

export interface IReview {
  _id: string
  productId: string
  userId: string | IPublicUser
  rating: number
  title?: string
  body: string
  isVerified: boolean
  helpfulVotes: string[]
  reportedBy: string[]
  sellerReply?: string
  sellerReplyAt?: string
  createdAt: string
  updatedAt: string
}

export interface IAnswer {
  _id: string
  userId: string | IPublicUser
  answer: string
  likes: string[]
  createdAt: string
}

export interface IQuestion {
  _id: string
  productId: string
  userId: string | IPublicUser
  question: string
  answers: IAnswer[]
  createdAt: string
}

export interface ProductFilters {
  category?: string
  subCategory?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  inStock?: boolean
  isFeatured?: boolean
  sellerId?: string
  search?: string
  page?: number
  limit?: number
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular'
}

export interface CartItem {
  product: IProduct
  quantity: number
}
