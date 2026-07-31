import api from './api.js'
import type { ApiResponse } from '../../shared/types/api.types.js'
import type { ICoupon, IPromotion } from '../../shared/types/promotion.types.js'

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const promotionService = {
  // ── Public ────────────────────────────────────────────────────────────────────
  getActivePromotions: async (): Promise<IPromotion[]> => {
    const res = await api.get<ApiResponse<IPromotion[]>>('/promotions')
    return res.data.data ?? []
  },

  // ── Admin Coupons ─────────────────────────────────────────────────────────────
  getCoupons: async (page = 1): Promise<PagedResult<ICoupon>> => {
    const res = await api.get<ApiResponse<PagedResult<ICoupon>>>(`/admin/coupons?page=${page}`)
    return res.data.data!
  },

  createCoupon: async (data: Partial<ICoupon>): Promise<ICoupon> => {
    const res = await api.post<ApiResponse<ICoupon>>('/admin/coupons', data)
    return res.data.data!
  },

  updateCoupon: async (id: string, data: Partial<ICoupon>): Promise<ICoupon> => {
    const res = await api.put<ApiResponse<ICoupon>>(`/admin/coupons/${id}`, data)
    return res.data.data!
  },

  deleteCoupon: async (id: string): Promise<void> => {
    await api.delete(`/admin/coupons/${id}`)
  },

  toggleCoupon: async (id: string): Promise<ICoupon> => {
    const res = await api.patch<ApiResponse<ICoupon>>(`/admin/coupons/${id}/toggle`)
    return res.data.data!
  },

  // ── Admin Promotions ──────────────────────────────────────────────────────────
  getPromotions: async (page = 1): Promise<PagedResult<IPromotion>> => {
    const res = await api.get<ApiResponse<PagedResult<IPromotion>>>(
      `/admin/promotions?page=${page}`,
    )
    return res.data.data!
  },

  createPromotion: async (data: Partial<IPromotion>): Promise<IPromotion> => {
    const res = await api.post<ApiResponse<IPromotion>>('/admin/promotions', data)
    return res.data.data!
  },

  updatePromotion: async (id: string, data: Partial<IPromotion>): Promise<IPromotion> => {
    const res = await api.put<ApiResponse<IPromotion>>(`/admin/promotions/${id}`, data)
    return res.data.data!
  },

  deletePromotion: async (id: string): Promise<void> => {
    await api.delete(`/admin/promotions/${id}`)
  },

  togglePromotion: async (id: string): Promise<IPromotion> => {
    const res = await api.patch<ApiResponse<IPromotion>>(`/admin/promotions/${id}/toggle`)
    return res.data.data!
  },
}
