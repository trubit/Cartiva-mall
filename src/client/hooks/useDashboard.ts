import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboardService.js'
import { useDashboardStore } from '../store/dashboardStore.js'
import type {
  DashboardSettingsPayload,
  ChangePasswordPayload,
} from '../../shared/types/dashboard.types.js'

export const DASHBOARD_KEY = ['dashboard'] as const
export const WISHLIST_KEY = [...DASHBOARD_KEY, 'wishlist'] as const
export const NOTIF_KEY = [...DASHBOARD_KEY, 'notifications'] as const
export const PAYMENT_HISTORY_KEY = [...DASHBOARD_KEY, 'payments'] as const
export const RECENT_KEY = [...DASHBOARD_KEY, 'recently-viewed'] as const

// ─── Overview ────────────────────────────────────────────────────────────────
export const useDashboardSummary = () =>
  useQuery({
    queryKey: [...DASHBOARD_KEY, 'summary'],
    queryFn: dashboardService.getSummary,
    staleTime: 60_000,
  })

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const useWishlist = () => {
  const setWishlist = useDashboardStore((s) => s.setWishlist)

  return useQuery({
    queryKey: WISHLIST_KEY,
    queryFn: async () => {
      const result = await dashboardService.getWishlist()
      setWishlist(result.items)
      return result
    },
    staleTime: 30_000,
  })
}

export const useAddToWishlist = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => dashboardService.addToWishlist(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_KEY })
      qc.invalidateQueries({ queryKey: [...DASHBOARD_KEY, 'summary'] })
    },
  })
}

export const useRemoveFromWishlist = () => {
  const qc = useQueryClient()
  const removeFromStore = useDashboardStore((s) => s.removeFromWishlist)

  return useMutation({
    mutationFn: (productId: string) => dashboardService.removeFromWishlist(productId),
    onMutate: (productId) => {
      removeFromStore(productId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_KEY })
      qc.invalidateQueries({ queryKey: [...DASHBOARD_KEY, 'summary'] })
    },
  })
}

export const useCheckWishlist = (productId: string) =>
  useQuery({
    queryKey: [...WISHLIST_KEY, productId, 'check'],
    queryFn: () => dashboardService.checkWishlist(productId),
    enabled: Boolean(productId),
    staleTime: 30_000,
  })

// ─── Notifications ────────────────────────────────────────────────────────────
export const useNotifications = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: [...NOTIF_KEY, params],
    queryFn: () => dashboardService.getNotifications(params),
    staleTime: 15_000,
  })

export const useUnreadCount = () => {
  const setUnreadCount = useDashboardStore((s) => s.setUnreadCount)

  return useQuery({
    queryKey: [...NOTIF_KEY, 'unread-count'],
    queryFn: async () => {
      const count = await dashboardService.getUnreadCount()
      setUnreadCount(count)
      return count
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export const useMarkNotificationRead = () => {
  const qc = useQueryClient()
  const decrementUnread = useDashboardStore((s) => s.decrementUnreadCount)

  return useMutation({
    mutationFn: (id: string) => dashboardService.markNotificationRead(id),
    onSuccess: () => {
      decrementUnread()
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    },
  })
}

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient()
  const resetUnread = useDashboardStore((s) => s.resetUnreadCount)

  return useMutation({
    mutationFn: dashboardService.markAllNotificationsRead,
    onSuccess: () => {
      resetUnread()
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    },
  })
}

// ─── Payment History ──────────────────────────────────────────────────────────
export const usePaymentHistory = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: [...PAYMENT_HISTORY_KEY, params],
    queryFn: () => dashboardService.getPaymentHistory(params),
    staleTime: 60_000,
  })

// ─── Recently Viewed ──────────────────────────────────────────────────────────
export const useRecentlyViewed = () => {
  const setRecent = useDashboardStore((s) => s.setRecentProducts)

  return useQuery({
    queryKey: RECENT_KEY,
    queryFn: async () => {
      const products = await dashboardService.getRecentlyViewed()
      setRecent(products)
      return products
    },
    staleTime: 60_000,
  })
}

export const useTrackRecentlyViewed = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => dashboardService.trackRecentlyViewed(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECENT_KEY })
    },
  })
}

// ─── Account ──────────────────────────────────────────────────────────────────
export const useUpdateSettings = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: DashboardSettingsPayload) => dashboardService.updateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...DASHBOARD_KEY, 'summary'] })
    },
  })
}

// ─── Security ────────────────────────────────────────────────────────────────
export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: ChangePasswordPayload) => dashboardService.changePassword(payload),
  })
