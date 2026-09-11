import type {
  IPaymentProvider,
  IPaymentInitParams,
  IPaymentInitResult,
  IPaymentVerifyResult,
  IRefundParams,
  IRefundResult,
} from './paymentProvider.interface.js'
import * as stripeService from '../stripe.service.js'
import { env } from '../../../config/env.js'

export class StripeProvider implements IPaymentProvider {
  readonly name = 'stripe' as const

  isConfigured(): boolean {
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY)
  }

  async initializePayment(params: IPaymentInitParams): Promise<IPaymentInitResult> {
    const init = await stripeService.createPaymentIntent(params.orderId, params.userId)
    return {
      paymentIntentId: init.paymentIntentId,
      clientSecret: init.clientSecret,
      publicKey: init.publicKey,
      currency: init.currency,
      amount: init.amount,
      reference: init.paymentIntentId,
    }
  }

  async verifyPayment(reference: string, userId?: string): Promise<IPaymentVerifyResult> {
    const order = await stripeService.confirmPaymentIntent(reference, userId || '')
    return {
      orderId: order._id.toString(),
      reference,
      status: order.paymentStatus === 'paid' ? 'paid' : 'pending',
      amount: order.grandTotal,
      currency: order.currency,
      transactionId: (order as any).paymentIntentId || reference,
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    await stripeService.handleStripeWebhook(rawBody, signature)
  }

  async refund(params: IRefundParams): Promise<IRefundResult> {
    const res = await stripeService.refundStripeTransaction(
      params.orderId,
      params.userId,
      params.reason,
      params.amount,
    )
    return {
      refundId: res.refundId,
      orderId: res.orderId,
      amount: res.amount,
      status: res.status,
      currency: res.currency,
    }
  }
}

export const stripeProvider = new StripeProvider()
