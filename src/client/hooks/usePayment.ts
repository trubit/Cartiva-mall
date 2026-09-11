import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { orderService } from '../services/orderService.js'
import { paymentService } from '../services/paymentService.js'
import { usePaymentStore } from '../store/paymentStore.js'
import { useCheckoutStore } from '../store/checkoutStore.js'
import type { IRefundRequest } from '../../shared/types/index.js'

import { ORDER_KEY } from './useOrders.js'
export { useMyOrders, useOrder, ORDER_KEY } from './useOrders.js'

// Create order then navigate to Paystack / Bank transfer payment page
export const useCreateOrder = () => {
  const setOrderData = usePaymentStore((s) => s.setOrderData)
  const checkoutReset = useCheckoutStore((s) => s.reset)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({
      checkoutSessionId,
      notes,
      paymentMethodType,
      currency,
    }: {
      checkoutSessionId: string
      notes?: string
      paymentMethodType?: string
      currency?: string
    }) => orderService.createOrder(checkoutSessionId, notes, paymentMethodType, currency),
    onSuccess: (data) => {
      setOrderData(data)
      checkoutReset()
      navigate(`/payment/${data.orderId}`)
    },
  })
}

// Available payment providers
export const usePaymentProviders = () =>
  useQuery({
    queryKey: ['payment', 'providers'],
    queryFn: () => paymentService.getProviders(),
    staleTime: 5 * 60 * 1000,
  })

// Initialize Paystack transaction
export const usePaystackInitialize = () => {
  const setStep = usePaymentStore((s) => s.setStep)
  const setError = usePaymentStore((s) => s.setError)

  return useMutation({
    mutationFn: ({ orderId, email }: { orderId: string; email: string }) =>
      paymentService.paystackInitialize(orderId, email),
    onMutate: () => {
      setStep('processing')
    },
    onError: (err: Error) => {
      setError(err.message)
      setStep('failed')
    },
  })
}

import { useCartStore } from '../store/cartStore.js'

// Verify Paystack transaction after popup closes
export const usePaystackVerify = (orderId?: string) => {
  const navigate = useNavigate()
  const setStep = usePaymentStore((s) => s.setStep)
  const setOrder = usePaymentStore((s) => s.setOrder)
  const setError = usePaymentStore((s) => s.setError)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (reference: string) => paymentService.paystackVerify(reference, orderId),
    onMutate: () => {
      setStep('processing')
    },
    onSuccess: (data: any) => {
      const verifiedOrderId =
        data?._id || data?.orderId || orderId || usePaymentStore.getState().orderId
      if (verifiedOrderId) {
        qc.setQueryData([...ORDER_KEY, verifiedOrderId], data)
        qc.invalidateQueries({ queryKey: [...ORDER_KEY, verifiedOrderId] })
      }
      qc.invalidateQueries({ queryKey: ORDER_KEY })
      qc.invalidateQueries({ queryKey: ['cart'] })
      useCartStore.getState().clearServerCart()
      useCartStore.getState().clearGuestCart()
      setOrder(data)
      setStep('success')
      navigate(
        verifiedOrderId ? `/payment/success?orderId=${verifiedOrderId}` : '/payment/success',
        { replace: true },
      )
    },
    onError: (err: Error) => {
      setError(err.message)
      setStep('failed')
    },
  })
}

// Request a refund
export const useRefundPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IRefundRequest) => paymentService.refundPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORDER_KEY })
    },
  })
}
