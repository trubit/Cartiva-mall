import api from './api'
import type {
  IVendorSubscription,
  VendorCommissionSummary,
  SubscriptionPlan,
} from '../../shared/types/vendor.types.js'

interface VendorList {
  items: {
    _id: string
    firstName: string
    lastName: string
    email: string
    isActive: boolean
    createdAt: string
    subscription?: IVendorSubscription
  }[]
  total: number
  page: number
  pages: number
}

export const vendorService = {
  getMySubscription: () => api.get<{ data: IVendorSubscription | null }>('/vendor/subscription'),

  subscribe: (plan: SubscriptionPlan) =>
    api.post<{ data: IVendorSubscription }>('/vendor/subscription', { plan }),

  cancelSubscription: () => api.delete('/vendor/subscription'),

  getMyCommissions: (page = 1, limit = 20) =>
    api.get<{ data: VendorCommissionSummary }>('/vendor/commissions', { params: { page, limit } }),

  getMyStats: () => api.get<{ data: Record<string, unknown> }>('/vendor/stats'),

  listVendors: (page = 1, limit = 20) =>
    api.get<{ data: VendorList }>('/vendor/admin/list', { params: { page, limit } }),

  suspendVendor: (sellerId: string, reason?: string) =>
    api.put(`/vendor/admin/${sellerId}/suspend`, { reason }),

  reinstateVendor: (sellerId: string) => api.put(`/vendor/admin/${sellerId}/reinstate`),

  getVendorCommissions: (sellerId: string, page = 1) =>
    api.get<{ data: VendorCommissionSummary }>(`/vendor/admin/${sellerId}/commissions`, {
      params: { page },
    }),
}
