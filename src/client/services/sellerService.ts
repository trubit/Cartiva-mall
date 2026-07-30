import api from './api.js'
import type {
  ISellerProfile,
  ISellerDashboard,
  ISellerAnalytics,
  ISellerEarnings,
} from '../../shared/types/index.js'
import type { IProduct } from '../../shared/types/index.js'
import type { IOrder } from '../../shared/types/index.js'
import type { ApiResponse } from '../../shared/types/index.js'

// ─── Profile ──────────────────────────────────────────────────────────────────
export const sellerService = {
  onboardSeller: async (data: {
    storeName: string
    storeDescription?: string
    storeAddress?: Record<string, string>
  }): Promise<ApiResponse<ISellerProfile>> => {
    const res = await api.post<ApiResponse<ISellerProfile>>('/seller/onboard', data)
    return res.data
  },

  getSellerProfile: async (): Promise<ApiResponse<ISellerProfile>> => {
    const res = await api.get<ApiResponse<ISellerProfile>>('/seller/profile')
    return res.data
  },

  updateSellerProfile: async (
    data: Partial<{
      storeName: string
      storeDescription: string
      storeLogo: string
      storeAddress: Record<string, string>
    }>,
  ): Promise<ApiResponse<ISellerProfile>> => {
    const res = await api.put<ApiResponse<ISellerProfile>>('/seller/profile', data)
    return res.data
  },

  // ─── Dashboard & analytics ─────────────────────────────────────────────────
  getSellerDashboard: async (): Promise<ApiResponse<ISellerDashboard>> => {
    const res = await api.get<ApiResponse<ISellerDashboard>>('/seller/dashboard')
    return res.data
  },

  getSellerAnalytics: async (params?: {
    days?: number
  }): Promise<ApiResponse<ISellerAnalytics>> => {
    const res = await api.get<ApiResponse<ISellerAnalytics>>('/seller/analytics', { params })
    return res.data
  },

  getSellerEarnings: async (): Promise<ApiResponse<ISellerEarnings>> => {
    const res = await api.get<ApiResponse<ISellerEarnings>>('/seller/earnings')
    return res.data
  },

  // ─── Products ──────────────────────────────────────────────────────────────
  getSellerProducts: async (params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    sort?: string
  }): Promise<ApiResponse<IProduct[]>> => {
    const res = await api.get<ApiResponse<IProduct[]>>('/seller/products', { params })
    return res.data
  },

  createProduct: async (data: Record<string, unknown>): Promise<ApiResponse<IProduct>> => {
    const res = await api.post<ApiResponse<IProduct>>('/seller/product/create', data)
    return res.data
  },

  updateProduct: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse<IProduct>> => {
    const res = await api.put<ApiResponse<IProduct>>(`/seller/product/update/${id}`, data)
    return res.data
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/seller/product/delete/${id}`)
  },

  // ─── Orders ────────────────────────────────────────────────────────────────
  getSellerOrders: async (params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<IOrder[]>> => {
    const res = await api.get<ApiResponse<IOrder[]>>('/seller/orders', { params })
    return res.data
  },
}
