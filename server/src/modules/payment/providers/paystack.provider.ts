import type {
  IPaymentProvider,
  IPaymentInitParams,
  IPaymentInitResult,
  IPaymentVerifyResult,
  IRefundParams,
  IRefundResult,
  IPayoutParams,
  IPayoutResult,
} from './paymentProvider.interface.js'
import * as paystackService from '../paystack.service.js'
import { env } from '../../../config/env.js'

export class PaystackProvider implements IPaymentProvider {
  readonly name = 'paystack' as const

  isConfigured(): boolean {
    return Boolean(env.PAYSTACK_SECRET_KEY && env.PAYSTACK_PUBLIC_KEY)
  }

  async initializePayment(params: IPaymentInitParams): Promise<IPaymentInitResult> {
    const init = await paystackService.initializeTransaction(
      params.orderId,
      params.userId,
      params.email,
    )
    return {
      paymentIntentId: init.reference,
      authorizationUrl: init.authorizationUrl,
      publicKey: init.publicKey,
      currency: init.currency,
      amount: init.amount,
      reference: init.reference,
    }
  }

  async verifyPayment(reference: string, userId?: string): Promise<IPaymentVerifyResult> {
    const order = await paystackService.verifyTransaction(reference, userId)
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
    await paystackService.handleWebhook(rawBody, signature)
  }

  async refund(params: IRefundParams): Promise<IRefundResult> {
    const res = await paystackService.refundTransaction(
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

  async initiatePayout(params: IPayoutParams): Promise<IPayoutResult> {
    const res = await paystackService.initiateTransfer({
      amountMinor: params.amountMinor,
      recipientCode: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
    })
    return {
      transferCode: res.transferCode,
      status: res.status,
      reference: res.reference,
    }
  }
}

export const paystackProvider = new PaystackProvider()
