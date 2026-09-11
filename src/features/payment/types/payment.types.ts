export type PaymentProvider = 'paystack' | 'stripe'

export interface IPaymentProviderCapabilities {
  enabled: boolean
  methods: string[]
  currencies: string[]
}

export interface IPaymentProvidersResponse {
  paystack: IPaymentProviderCapabilities
  stripe: IPaymentProviderCapabilities
}

export interface IPaymentRecord {
  _id: string
  userId: string
  orderId: string
  provider: PaymentProvider
  paymentIntentId: string
  clientSecret?: string
  transactionId?: string
  paymentMethod: string
  currency: string
  amount: number
  status:
    | 'pending'
    | 'processing'
    | 'authorized'
    | 'captured'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'refunded'
    | 'partially_refunded'
  createdAt: string
  updatedAt: string
}
