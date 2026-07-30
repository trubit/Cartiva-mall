export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export interface IPayment {
  _id: string
  userId: string
  orderId: string
  paymentIntentId: string
  transactionId?: string
  paymentMethod: string
  currency: string
  amount: number
  status: PaymentStatus
  createdAt: string
  updatedAt: string
}

export interface ICreateOrderResponse {
  orderId: string
  orderNumber: string
  amount: number
  currency: string
}

export interface IRefundRequest {
  orderId: string
  reason?: string
  amount?: number
}

export interface IRefundResponse {
  refundId: string
  orderId: string
  amount: number
  status: string
  currency: string
}
