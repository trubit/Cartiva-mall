import { create } from 'zustand'
import type {
  ICheckoutAddress,
  ICheckoutSession,
  IShippingOption,
  ShippingMethod,
} from '../../shared/types/checkout.types.js'

export type CheckoutStep = 1 | 2 | 3

interface CheckoutStore {
  // ── Wizard navigation ──────────────────────────────────
  step: CheckoutStep
  setStep: (s: CheckoutStep) => void
  nextStep: () => void
  prevStep: () => void

  // ── Form data ──────────────────────────────────────────
  shippingAddress: ICheckoutAddress | null
  billingAddress: ICheckoutAddress | null
  sameAsShipping: boolean
  selectedMethod: ShippingMethod

  setShippingAddress: (addr: ICheckoutAddress) => void
  setBillingAddress: (addr: ICheckoutAddress | null) => void
  setSameAsShipping: (v: boolean) => void
  setSelectedMethod: (m: ShippingMethod) => void

  // ── Coupon UI state ─────────────────────────────────────
  couponError: string | null
  setCouponError: (e: string | null) => void

  // ── Server session ──────────────────────────────────────
  session: ICheckoutSession | null
  shippingOptions: IShippingOption[]
  setSession: (s: ICheckoutSession) => void
  setShippingOptions: (opts: IShippingOption[]) => void

  // ── Reset ───────────────────────────────────────────────
  reset: () => void
}

const initialState: Pick<
  CheckoutStore,
  | 'step'
  | 'shippingAddress'
  | 'billingAddress'
  | 'sameAsShipping'
  | 'selectedMethod'
  | 'couponError'
  | 'session'
  | 'shippingOptions'
> = {
  step: 1,
  shippingAddress: null,
  billingAddress: null,
  sameAsShipping: true,
  selectedMethod: 'standard',
  couponError: null,
  session: null,
  shippingOptions: [],
}

export const useCheckoutStore = create<CheckoutStore>()((set, get) => ({
  ...initialState,

  setStep: (s) => set({ step: s }),
  nextStep: () => set((st) => ({ step: Math.min(st.step + 1, 3) as CheckoutStep })),
  prevStep: () => set((st) => ({ step: Math.max(st.step - 1, 1) as CheckoutStep })),

  setShippingAddress: (addr) => {
    set({ shippingAddress: addr })
    if (get().sameAsShipping) set({ billingAddress: addr })
  },
  setBillingAddress: (addr) => set({ billingAddress: addr }),
  setSameAsShipping: (v) => {
    set({ sameAsShipping: v })
    if (v) set({ billingAddress: get().shippingAddress })
  },
  setSelectedMethod: (m) => set({ selectedMethod: m }),

  setCouponError: (e) => set({ couponError: e }),

  setSession: (s) => set({ session: s, selectedMethod: s.shippingMethod }),
  setShippingOptions: (opts) => set({ shippingOptions: opts }),

  reset: () => set(initialState),
}))
