import { create } from 'zustand'
import type { ICreateOrderResponse, IOrder } from '../../shared/types/index.js'

export type PaymentStep = 'form' | 'processing' | 'success' | 'failed'

interface PaymentState {
  orderId: string | null
  orderNumber: string | null
  amount: number | null
  currency: string
  order: IOrder | null
  step: PaymentStep
  errorMessage: string | null

  setOrderData: (data: ICreateOrderResponse) => void
  setOrder: (order: IOrder) => void
  setStep: (step: PaymentStep) => void
  setError: (msg: string | null) => void
  reset: () => void
}

const initial = {
  orderId: null,
  orderNumber: null,
  amount: null,
  currency: 'NGN',
  order: null,
  step: 'form' as PaymentStep,
  errorMessage: null,
}

export const usePaymentStore = create<PaymentState>((set) => ({
  ...initial,

  setOrderData: (data) =>
    set({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      amount: data.amount,
      currency: data.currency,
      step: 'form',
      errorMessage: null,
    }),

  setOrder: (order) => set({ order }),
  setStep: (step) => set({ step }),
  setError: (msg) => set({ errorMessage: msg }),
  reset: () => set(initial),
}))
