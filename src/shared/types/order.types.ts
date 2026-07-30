import type { IAddress } from './user.types.js'
import type { IServerCartItem } from './cart.types.js'
import type { ReturnReason } from '../constants/index.js'

// ─── Status enums ──────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'outForDelivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'

export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed'

import type { ShippingMethod } from './checkout.types.js'
export type { ShippingMethod }

// ─── Tracking ─────────────────────────────────────────────────────────────────
export interface ITrackingEvent {
  status: OrderStatus
  location?: string
  description: string
  timestamp: string
}

export interface IOrderTracking {
  trackingNumber?: string
  carrier?: string
  trackingUrl?: string
  estimatedDeliveryDate?: string
  events: ITrackingEvent[]
}

// ─── Return request ───────────────────────────────────────────────────────────
export interface IReturnRequest {
  reason: ReturnReason
  description?: string
  status: ReturnStatus
  requestedAt: string
  resolvedAt?: string
  refundAmount?: number
}

// ─── Order item ───────────────────────────────────────────────────────────────
export interface IOrderItem {
  productId: string
  title: string
  image?: string
  sku: string
  quantity: number
  itemPrice: number
  lineTotal: number
  selectedSize?: string
  selectedColor?: string
}

// ─── Full order ───────────────────────────────────────────────────────────────
export interface IOrder {
  _id: string
  orderNumber: string
  userId: string
  checkoutSessionId?: string
  items: IOrderItem[]
  shippingAddress: IAddress & { fullName: string; phone: string }
  billingAddress?: IAddress & { fullName: string; phone: string }
  sameAsShipping: boolean
  shippingMethod: ShippingMethod
  subtotal: number
  discountAmount: number
  shippingFee: number
  taxAmount: number
  grandTotal: number
  couponCode?: string
  paymentStatus: OrderPaymentStatus
  orderStatus: OrderStatus
  paymentIntentId?: string
  notes?: string
  tracking?: IOrderTracking
  returnRequest?: IReturnRequest
  createdAt: string
  updatedAt: string
}

// Kept for backward compat — points at IServerCartItem
export type ICartItem = IServerCartItem
