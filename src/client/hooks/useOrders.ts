import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderService, type PagedOrders } from '../services/orderService.js'
import { useOrderStore } from '../store/orderStore.js'
import type { ReturnReason } from '../../shared/constants/index.js'

export const ORDER_KEY = ['orders'] as const
export const SELLER_ORDER_KEY = ['orders', 'seller'] as const

// ─── Fetch user's orders ──────────────────────────────────────────────────────
export const useMyOrders = (params?: { status?: string; page?: number; limit?: number }) =>
  useQuery<PagedOrders>({
    queryKey: [...ORDER_KEY, params],
    queryFn: () => orderService.getMyOrders(params),
    staleTime: 30_000,
  })

const isValidObjectId = (id?: string): boolean =>
  Boolean(id) && id !== ':id' && /^[0-9a-fA-F]{24}$/.test(id!)

// ─── Fetch single order ───────────────────────────────────────────────────────
export const useOrder = (
  orderId: string,
  options?: {
    refetchInterval?: number | false | ((query: any) => number | false)
    staleTime?: number
  },
) =>
  useQuery({
    queryKey: [...ORDER_KEY, orderId],
    queryFn: () => orderService.getOrder(orderId),
    enabled: isValidObjectId(orderId),
    staleTime: options?.staleTime ?? 15_000,
    refetchInterval: options?.refetchInterval,
  })

// ─── Tracking info (lightweight endpoint) ────────────────────────────────────
export const useTrackOrder = (orderId: string) =>
  useQuery({
    queryKey: [...ORDER_KEY, orderId, 'track'],
    queryFn: () => orderService.trackOrder(orderId),
    enabled: isValidObjectId(orderId),
    staleTime: 10_000,
  })

// ─── Cancel order ─────────────────────────────────────────────────────────────
export const useCancelOrder = () => {
  const qc = useQueryClient()
  const updateOrderInList = useOrderStore((s) => s.updateOrderInList)

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: (updated) => {
      updateOrderInList(updated)
      qc.invalidateQueries({ queryKey: ORDER_KEY })
    },
  })
}

// ─── Request return ───────────────────────────────────────────────────────────
export const useRequestReturn = () => {
  const qc = useQueryClient()
  const setReturnStatus = useOrderStore((s) => s.setReturnStatus)
  const setReturnError = useOrderStore((s) => s.setReturnError)
  const updateOrderInList = useOrderStore((s) => s.updateOrderInList)

  return useMutation({
    mutationFn: ({
      orderId,
      reason,
      description,
    }: {
      orderId: string
      reason: ReturnReason
      description?: string
    }) => orderService.requestReturn(orderId, reason, description),

    onMutate: () => {
      setReturnStatus('submitting')
      setReturnError(null)
    },
    onSuccess: (updated) => {
      setReturnStatus('success')
      updateOrderInList(updated)
      qc.invalidateQueries({ queryKey: ORDER_KEY })
    },
    onError: (err: Error) => {
      setReturnStatus('error')
      setReturnError(err.message ?? 'Failed to submit return request')
    },
  })
}

// ─── Update order status (seller) ────────────────────────────────────────────
export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  const updateInList = useOrderStore((s) => s.updateOrderInList)

  return useMutation({
    mutationFn: (input: {
      orderId: string
      orderStatus: string
      tracking?: {
        trackingNumber?: string
        carrier?: string
        trackingUrl?: string
        estimatedDeliveryDate?: string
        location?: string
        note?: string
      }
    }) => orderService.updateOrderStatus(input.orderId, input.orderStatus, input.tracking),
    onSuccess: (updated) => {
      updateInList(updated)
      qc.invalidateQueries({ queryKey: ORDER_KEY })
      qc.invalidateQueries({ queryKey: SELLER_ORDER_KEY })
    },
  })
}

// ─── Seller orders ────────────────────────────────────────────────────────────
export const useSellerOrders = (params?: { status?: string; page?: number; limit?: number }) =>
  useQuery<PagedOrders>({
    queryKey: [...SELLER_ORDER_KEY, params],
    queryFn: () => orderService.getSellerOrders(params),
    staleTime: 30_000,
  })
