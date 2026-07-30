import type { IUser } from './user.types.js'
import type { IOrder } from './order.types.js'
import type { IProduct } from './product.types.js'

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'order' | 'system' | 'promotion' | 'wishlist' | 'security'

export interface INotification {
  _id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link?: string
  data?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export interface IWishlistItem {
  _id: string
  productId: IProduct
  addedAt: string
}

export interface IWishlist {
  userId: string
  items: IWishlistItem[]
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export interface DashboardOrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  totalSpent: number
}

export interface DashboardUserSummary {
  user: IUser
  orderStats: DashboardOrderStats
  wishlistCount: number
  unreadNotifications: number
  recentOrders: IOrder[]
}

// ─── Payment History (dashboard view) ────────────────────────────────────────
export interface IDashboardPayment {
  _id: string
  orderId: string
  paymentIntentId: string
  paymentMethod: string
  currency: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  createdAt: string
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────
export interface IRecentlyViewed {
  productId: string
  viewedAt: string
}

// ─── Settings update payload ──────────────────────────────────────────────────
export interface DashboardSettingsPayload {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  bio?: string
  language?: string
}

// ─── Security update payload ──────────────────────────────────────────────────
export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
