import api from './api.js'
import type { IRefundRequest, IRefundResponse } from '../../shared/types/index.js'

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data

export interface PaymentProviders {
  paystack: { enabled: boolean; methods: string[]; currencies: string[] }
}

export interface PaystackInitResponse {
  reference: string
  accessCode: string
  authorizationUrl: string
  publicKey: string
  currency: string
  amount: number
}

export const paymentService = {
  refundPayment(input: IRefundRequest): Promise<IRefundResponse> {
    return api.post('/payment/refund', input).then(unwrap<IRefundResponse>)
  },

  getProviders(): Promise<PaymentProviders> {
    return api.get('/payment/providers').then(unwrap<PaymentProviders>)
  },

  paystackInitialize(orderId: string, email: string): Promise<PaystackInitResponse> {
    return api
      .post('/payment/paystack/initialize', { orderId, email })
      .then(unwrap<PaystackInitResponse>)
  },

  paystackVerify(reference: string, orderId?: string): Promise<any> {
    return api.post('/payment/paystack/verify', { reference, orderId }).then(unwrap<any>)
  },
}
