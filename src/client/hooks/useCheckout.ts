import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCheckoutStore } from '../store/checkoutStore.js'
import { checkoutService } from '../services/checkoutService.js'
import type { ICheckoutSession } from '../../shared/types/checkout.types.js'
import type {
  UpdateCheckoutInput,
  SelectShippingInput,
  ApplyCouponInput,
} from '../../shared/validators/checkout.validators.js'

export const CHECKOUT_KEY = ['checkout'] as const

// ─── Bootstrap: fetch or create session ───────────────────────────────────────
export const useCheckoutSession = () => {
  const { setSession, setShippingOptions } = useCheckoutStore()

  return useQuery({
    queryKey: CHECKOUT_KEY,
    queryFn: async () => {
      const data = await checkoutService.getCheckout()
      setSession(data.session)
      setShippingOptions(data.shippingOptions)
      return data
    },
    staleTime: 0,
    retry: false,
  })
}

// ─── Update address ────────────────────────────────────────────────────────────
export const useUpdateCheckout = () => {
  const qc = useQueryClient()
  const setSession = useCheckoutStore((s) => s.setSession)
  const nextStep = useCheckoutStore((s) => s.nextStep)

  return useMutation({
    mutationFn: (input: UpdateCheckoutInput) => checkoutService.updateCheckout(input),
    onSuccess: (session: ICheckoutSession) => {
      setSession(session)
      qc.setQueryData(
        CHECKOUT_KEY,
        (old: { session: ICheckoutSession; shippingOptions: unknown[] } | undefined) =>
          old ? { ...old, session } : old,
      )
      nextStep()
    },
  })
}

// ─── Select shipping ───────────────────────────────────────────────────────────
export const useSelectShipping = () => {
  const qc = useQueryClient()
  const setSession = useCheckoutStore((s) => s.setSession)
  const nextStep = useCheckoutStore((s) => s.nextStep)

  return useMutation({
    mutationFn: (input: SelectShippingInput) => checkoutService.selectShipping(input),
    onSuccess: (session: ICheckoutSession) => {
      setSession(session)
      qc.setQueryData(
        CHECKOUT_KEY,
        (old: { session: ICheckoutSession; shippingOptions: unknown[] } | undefined) =>
          old ? { ...old, session } : old,
      )
      nextStep()
    },
  })
}

// ─── Apply coupon ──────────────────────────────────────────────────────────────
export const useApplyCoupon = () => {
  const qc = useQueryClient()
  const { setSession, setCouponError } = useCheckoutStore()

  return useMutation({
    mutationFn: (input: ApplyCouponInput) => checkoutService.applyCoupon(input),
    onSuccess: (session: ICheckoutSession) => {
      setSession(session)
      setCouponError(null)
      qc.setQueryData(
        CHECKOUT_KEY,
        (old: { session: ICheckoutSession; shippingOptions: unknown[] } | undefined) =>
          old ? { ...old, session } : old,
      )
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCouponError(msg ?? 'Invalid coupon code')
    },
  })
}

// ─── Remove coupon ─────────────────────────────────────────────────────────────
export const useRemoveCoupon = () => {
  const qc = useQueryClient()
  const { setSession, setCouponError } = useCheckoutStore()

  return useMutation({
    mutationFn: () => checkoutService.removeCoupon(),
    onSuccess: (session: ICheckoutSession) => {
      setSession(session)
      setCouponError(null)
      qc.setQueryData(
        CHECKOUT_KEY,
        (old: { session: ICheckoutSession; shippingOptions: unknown[] } | undefined) =>
          old ? { ...old, session } : old,
      )
    },
  })
}
