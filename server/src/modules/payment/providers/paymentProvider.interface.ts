export interface IPaymentInitParams {
  orderId: string
  userId: string
  email: string
  amount: number
  currency: string
  callbackUrl?: string
  metadata?: Record<string, unknown>
}

export interface IPaymentInitResult {
  paymentIntentId: string
  authorizationUrl?: string
  clientSecret?: string
  publicKey?: string
  currency: string
  amount: number
  reference: string
}

export interface IPaymentVerifyResult {
  orderId: string
  reference: string
  status: 'paid' | 'failed' | 'pending'
  amount: number
  currency: string
  transactionId?: string
  metadata?: Record<string, unknown>
}

export interface IRefundParams {
  orderId: string
  userId: string
  amount?: number
  reason?: string
}

export interface IRefundResult {
  refundId: string
  orderId: string
  amount: number
  status: string
  currency: string
}

export interface IPayoutParams {
  amountMinor: number
  recipientCode: string
  reason: string
  reference: string
  currency?: string
}

export interface IPayoutResult {
  transferCode: string
  status: string
  reference: string
}

export interface IPaymentProvider {
  name: 'paystack' | 'stripe'
  isConfigured(): boolean
  initializePayment(params: IPaymentInitParams): Promise<IPaymentInitResult>
  verifyPayment(reference: string, userId?: string): Promise<IPaymentVerifyResult>
  handleWebhook(rawBody: Buffer, signature: string): Promise<void>
  refund(params: IRefundParams): Promise<IRefundResult>
  initiatePayout?(params: IPayoutParams): Promise<IPayoutResult>
}
