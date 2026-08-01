export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled'

export interface IShipmentEvent {
  status: ShipmentStatus
  location?: string
  description: string
  timestamp: string
}

export interface IShipment {
  _id: string
  orderId: { _id: string; orderNumber: string; grandTotal: number } | string
  userId: string
  sellerId?: string
  status: ShipmentStatus
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  estimatedDelivery?: string
  deliveredAt?: string
  shippingCost: number
  weight?: number
  labelUrl?: string
  shippingAddress: {
    fullName: string
    phone: string
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  events: IShipmentEvent[]
  createdAt: string
  updatedAt: string
}

export interface ShipmentList {
  items: IShipment[]
  total: number
  page: number
  pages: number
}
