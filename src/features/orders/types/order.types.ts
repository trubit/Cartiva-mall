export interface IOrderAddress {
  fullName: string
  phone: string
  country: string
  state: string
  city: string
  street: string
  postalCode: string
  addressLine2?: string
  deliveryInstructions?: string
}

export interface IOrderItem {
  productId: string
  variantId?: string
  sellerId?: string
  title: string
  image?: string
  sku: string
  quantity: number
  itemPrice: number
  lineTotal: number
  selectedSize?: string
  selectedColor?: string
  fulfillmentStatus?: string
}

export interface ITrackingEvent {
  status: string
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

export interface IOrderHistoryEntry {
  status: string
  actor: string
  timestamp: string
  reason?: string
  correlationId?: string
}

export interface IOrder {
  _id: string
  orderNumber: string
  userId: string
  items: IOrderItem[]
  shippingAddress: IOrderAddress
  billingAddress?: IOrderAddress
  sameAsShipping: boolean
  shippingMethod: 'standard' | 'express' | 'sameDay'
  subtotal: number
  discountAmount: number
  shippingFee: number
  taxAmount: number
  grandTotal: number
  currency?: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  orderStatus:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'outForDelivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'refunded'
  fulfillmentStatus?: string
  tracking?: IOrderTracking
  history?: IOrderHistoryEntry[]
  createdAt: string
  updatedAt: string
}
