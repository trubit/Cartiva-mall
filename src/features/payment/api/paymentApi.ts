import api from '../../../client/services/api.js'
import type { IPaymentProvidersResponse, IPaymentRecord } from '../types/payment.types.js'

export async function fetchPaymentProviders() {
  const response = await api.get('/payment/providers')
  return response.data.data as IPaymentProvidersResponse
}

export async function fetchPaymentHistory(params?: { page?: number; limit?: number }) {
  const response = await api.get('/payment/history', { params })
  return response.data
}

export async function fetchPaymentDetails(id: string) {
  const response = await api.get(`/payment/${id}`)
  return response.data.data as IPaymentRecord
}

export async function initializePaystackTransaction(orderId: string) {
  const response = await api.post('/payment/paystack/initialize', { orderId })
  return response.data.data
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await api.post('/payment/paystack/verify', { reference })
  return response.data.data
}

export async function createStripePaymentIntent(orderId: string) {
  const response = await api.post('/payment/stripe/create-intent', { orderId })
  return response.data.data
}

export async function confirmStripePayment(paymentIntentId: string) {
  const response = await api.post('/payment/stripe/confirm', { paymentIntentId })
  return response.data.data
}

export async function requestRefund(orderId: string, reason?: string, amount?: number) {
  const response = await api.post('/payment/refund', { orderId, reason, amount })
  return response.data.data
}
