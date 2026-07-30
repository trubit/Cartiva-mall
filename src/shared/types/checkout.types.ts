export type ShippingMethod = 'standard' | 'express' | 'sameDay'
export type CheckoutStatus = 'pending' | 'completed' | 'abandoned' | 'cancelled'
export type CouponType = 'percentage' | 'fixed'

// ─── Address used at checkout (extends profile with fullName + phone) ─────────
export interface ICheckoutAddress {
  fullName: string
  phone: string
  country: string
  state: string
  city: string
  street: string
  postalCode: string
}

// ─── Immutable item snapshot stored inside the checkout session ───────────────
export interface ICheckoutItem {
  productId: string
  title: string
  image?: string
  sku: string
  quantity: number
  itemPrice: number
  lineTotal: number
}

// ─── Shipping option shape ────────────────────────────────────────────────────
export interface IShippingOption {
  method: ShippingMethod
  label: string
  description: string
  cost: number
  estimatedDays: string
}

// ─── Pricing breakdown ────────────────────────────────────────────────────────
export interface ICheckoutPricing {
  subtotal: number
  discountAmount: number
  shippingFee: number
  taxAmount: number
  grandTotal: number
}

// ─── Full checkout session (server response) ──────────────────────────────────
export interface ICheckoutSession {
  _id: string
  userId: string
  items: ICheckoutItem[]
  shippingAddress: ICheckoutAddress | null
  billingAddress: ICheckoutAddress | null
  sameAsShipping: boolean
  shippingMethod: ShippingMethod
  couponCode?: string
  pricing: ICheckoutPricing
  status: CheckoutStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

// ─── Available shipping options (returned by GET /checkout) ──────────────────
export interface ICheckoutBootstrap {
  session: ICheckoutSession
  shippingOptions: IShippingOption[]
}
