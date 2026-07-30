import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerService } from '../services/sellerService.js'
import { useSellerStore } from '../store/sellerStore.js'
import type {
  ISellerProfile,
  ISellerDashboard,
  ISellerAnalytics,
  ISellerEarnings,
  IProduct,
  IOrder,
} from '../../shared/types/index.js'

export const SELLER_KEY = ['seller'] as const
export const SELLER_PROFILE = [...SELLER_KEY, 'profile'] as const
export const SELLER_DASH = [...SELLER_KEY, 'dashboard'] as const
export const SELLER_ANALYTICS = [...SELLER_KEY, 'analytics'] as const
export const SELLER_EARNINGS = [...SELLER_KEY, 'earnings'] as const
export const SELLER_PRODUCTS = [...SELLER_KEY, 'products'] as const
export const SELLER_ORDERS = [...SELLER_KEY, 'orders'] as const

// ─── Profile ──────────────────────────────────────────────────────────────────
export const useSellerProfile = () => {
  const setProfile = useSellerStore((s) => s.setProfile)
  return useQuery({
    queryKey: SELLER_PROFILE,
    queryFn: async (): Promise<ISellerProfile | null> => {
      try {
        const res = await sellerService.getSellerProfile()
        const p = res.data ?? null
        setProfile(p)
        return p
      } catch {
        setProfile(null)
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export const useOnboardSeller = () => {
  const qc = useQueryClient()
  const setProfile = useSellerStore((s) => s.setProfile)
  return useMutation({
    mutationFn: (data: {
      storeName: string
      storeDescription?: string
      storeAddress?: Record<string, string>
    }) => sellerService.onboardSeller(data),
    onSuccess: (res) => {
      setProfile(res.data ?? null)
      qc.invalidateQueries({ queryKey: SELLER_PROFILE })
    },
  })
}

export const useUpdateSellerProfile = () => {
  const qc = useQueryClient()
  const setProfile = useSellerStore((s) => s.setProfile)
  return useMutation({
    mutationFn: (
      data: Partial<{
        storeName: string
        storeDescription: string
        storeLogo: string
        storeAddress: Record<string, string>
      }>,
    ) => sellerService.updateSellerProfile(data),
    onSuccess: (res) => {
      setProfile(res.data ?? null)
      qc.invalidateQueries({ queryKey: SELLER_PROFILE })
    },
  })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const useSellerDashboard = () =>
  useQuery({
    queryKey: SELLER_DASH,
    queryFn: async (): Promise<ISellerDashboard> => {
      const res = await sellerService.getSellerDashboard()
      return res.data!
    },
    staleTime: 60 * 1000,
  })

// ─── Analytics ────────────────────────────────────────────────────────────────
export const useSellerAnalytics = (days = 30) =>
  useQuery({
    queryKey: [...SELLER_ANALYTICS, days],
    queryFn: async (): Promise<ISellerAnalytics> => {
      const res = await sellerService.getSellerAnalytics({ days })
      return res.data!
    },
    staleTime: 2 * 60 * 1000,
  })

// ─── Earnings ─────────────────────────────────────────────────────────────────
export const useSellerEarnings = () =>
  useQuery({
    queryKey: SELLER_EARNINGS,
    queryFn: async (): Promise<ISellerEarnings> => {
      const res = await sellerService.getSellerEarnings()
      return res.data!
    },
    staleTime: 2 * 60 * 1000,
  })

// ─── Products ─────────────────────────────────────────────────────────────────
export const useSellerProductsNS = (params?: {
  page?: number
  limit?: number
  search?: string
  category?: string
  sort?: string
}) =>
  useQuery({
    queryKey: [...SELLER_PRODUCTS, params],
    queryFn: async (): Promise<IProduct[]> => {
      const res = await sellerService.getSellerProducts(params)
      return res.data!
    },
    staleTime: 30 * 1000,
  })

export const useSellerCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => sellerService.createProduct(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SELLER_PRODUCTS }),
  })
}

export const useSellerUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      sellerService.updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SELLER_PRODUCTS }),
  })
}

export const useSellerDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sellerService.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SELLER_PRODUCTS }),
  })
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export const useSellerOrdersNS = (params?: { status?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: [...SELLER_ORDERS, params],
    queryFn: async (): Promise<IOrder[]> => {
      const res = await sellerService.getSellerOrders(params)
      return res.data!
    },
    staleTime: 30 * 1000,
  })
