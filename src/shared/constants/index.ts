export const APP_NAME = 'Cartiva'
export const API_PREFIX = '/api/v1'
export const SUPPORT_EMAIL = 'support@cartiva.com'
export const DEFAULT_CURRENCY = 'USD'

export const ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'outForDelivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
} as const

export const RETURN_REASONS = [
  'damaged',
  'wrong_item',
  'not_as_described',
  'defective',
  'no_longer_needed',
  'other',
] as const

export type ReturnReason = (typeof RETURN_REASONS)[number]

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  damaged: 'Item arrived damaged',
  wrong_item: 'Received wrong item',
  not_as_described: 'Item not as described',
  defective: 'Item is defective',
  no_longer_needed: 'No longer needed',
  other: 'Other reason',
}

/** Statuses the order owner can still cancel from */
export const CANCELLABLE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED] as const

/** Statuses that allow a return request */
export const RETURNABLE_STATUSES = [ORDER_STATUS.DELIVERED] as const

/** Days the customer has to request a return */
export const RETURN_WINDOW_DAYS = 30

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing & Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Health & Beauty',
  'Toys & Games',
  'Automotive',
  'Food & Grocery',
  'Jewelry & Accessories',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const
