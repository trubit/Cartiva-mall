import type { IProduct } from './product.types.js'

export type BehaviorEventType =
  | 'view'
  | 'search'
  | 'cart_add'
  | 'cart_remove'
  | 'wishlist_add'
  | 'purchase'

export interface BehaviorPayload {
  eventType: BehaviorEventType
  productId?: string
  category?: string
  query?: string
  metadata?: Record<string, unknown>
}

export interface IHomeRecommendations {
  bestSellers: IProduct[]
  newArrivals: IProduct[]
  personalizedForYou: IProduct[]
}
