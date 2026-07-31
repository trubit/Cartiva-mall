import api from './api.js'
import type {
  DashboardUserSummary,
  IWishlistItem,
  INotification,
  IDashboardPayment,
  DashboardSettingsPayload,
  ChangePasswordPayload,
} from '../../shared/types/dashboard.types.js'
import type { IProduct } from '../../shared/types/product.types.js'
import type { PaginationMeta } from '../../shared/types/index.js'

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data
const unwrapPage = <T>(res: { data: { data: T; pagination?: PaginationMeta } }) => ({
  data: res.data.data,
  pagination: res.data.pagination,
})

export const dashboardService = {
  // ── Summary ──────────────────────────────────────────────────────────────────
  getSummary(): Promise<DashboardUserSummary> {
    return api.get('/dashboard/summary').then(unwrap<DashboardUserSummary>)
  },

  // ── Wishlist ─────────────────────────────────────────────────────────────────
  getWishlist(): Promise<{ items: IWishlistItem[]; total: number }> {
    return api.get('/dashboard/wishlist').then(unwrap<{ items: IWishlistItem[]; total: number }>)
  },

  addToWishlist(productId: string): Promise<{ items: IWishlistItem[]; total: number }> {
    return api
      .post('/dashboard/wishlist', { productId })
      .then(unwrap<{ items: IWishlistItem[]; total: number }>)
  },

  removeFromWishlist(productId: string): Promise<void> {
    return api.delete(`/dashboard/wishlist/${productId}`).then(() => undefined)
  },

  checkWishlist(productId: string): Promise<boolean> {
    return api
      .get(`/dashboard/wishlist/${productId}/check`)
      .then((res: { data: { data: { inWishlist: boolean } } }) => res.data.data.inWishlist)
  },

  moveWishlistToCart(productId: string): Promise<unknown> {
    return api.post(`/dashboard/wishlist/${productId}/move-to-cart`).then(unwrap)
  },

  // ── Save for Later ────────────────────────────────────────────────────────────
  getSavedItems(): Promise<IProduct[]> {
    return api.get('/cart/save-for-later').then(unwrap<IProduct[]>)
  },

  saveForLater(productId: string): Promise<unknown> {
    return api.post(`/cart/save-for-later/${productId}`).then(unwrap)
  },

  restoreSavedItem(productId: string): Promise<unknown> {
    return api.post(`/cart/restore/${productId}`).then(unwrap)
  },

  removeSavedItem(productId: string): Promise<void> {
    return api.delete(`/cart/save-for-later/${productId}`).then(() => undefined)
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  getNotifications(params?: { page?: number; limit?: number }): Promise<{
    data: { notifications: INotification[]; total: number; unread: number }
    pagination?: PaginationMeta
  }> {
    return api
      .get('/dashboard/notifications', { params })
      .then(unwrapPage<{ notifications: INotification[]; total: number; unread: number }>)
  },

  getUnreadCount(): Promise<number> {
    return api
      .get('/dashboard/notifications/unread-count')
      .then((res: { data: { data: { count: number } } }) => res.data.data.count)
  },

  markNotificationRead(id: string): Promise<INotification> {
    return api.put(`/dashboard/notifications/${id}/read`).then(unwrap<INotification>)
  },

  markAllNotificationsRead(): Promise<void> {
    return api.put('/dashboard/notifications/read-all').then(() => undefined)
  },

  // ── Payment History ───────────────────────────────────────────────────────────
  getPaymentHistory(params?: { page?: number; limit?: number }): Promise<{
    data: { payments: IDashboardPayment[]; total: number }
    pagination?: PaginationMeta
  }> {
    return api
      .get('/dashboard/payments', { params })
      .then(unwrapPage<{ payments: IDashboardPayment[]; total: number }>)
  },

  // ── Recently Viewed ───────────────────────────────────────────────────────────
  getRecentlyViewed(): Promise<IProduct[]> {
    return api.get('/dashboard/recently-viewed').then(unwrap<IProduct[]>)
  },

  trackRecentlyViewed(productId: string): Promise<void> {
    return api.post('/dashboard/recently-viewed', { productId }).then(() => undefined)
  },

  // ── Account Settings ──────────────────────────────────────────────────────────
  updateSettings(payload: DashboardSettingsPayload) {
    return api.patch('/dashboard/settings', payload).then(unwrap)
  },

  // ── Security ──────────────────────────────────────────────────────────────────
  changePassword(payload: ChangePasswordPayload): Promise<void> {
    return api.patch('/dashboard/change-password', payload).then(() => undefined)
  },
}
