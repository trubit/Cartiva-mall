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

  // ─── Payouts & Withdrawals ───────────────────────────────────────────────────
  requestWithdrawal: async (data: {
    amount: number
    payoutAccountId: string
    idempotencyKey?: string
  }) => {
    const res = await api.post<ApiResponse<any>>('/seller/payout/withdraw', data)
    return res.data
  },

  getSellerWithdrawals: async (params?: { page?: number; limit?: number; status?: string }) => {
    const res = await api.get<ApiResponse<any[]>>('/seller/payout/withdrawals', { params })
    return res.data
  },

  getSellerPayoutAccounts: async () => {
    const res = await api.get<ApiResponse<any[]>>('/seller/payout/accounts')
    return res.data
  },

  addSellerPayoutAccount: async (data: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
    currency?: string
    isDefault?: boolean
  }) => {
    const res = await api.post<ApiResponse<any>>('/seller/payout/accounts', data)
    return res.data
  },

  deleteSellerPayoutAccount: async (id: string) => {
    const res = await api.delete<ApiResponse<null>>(`/seller/payout/accounts/${id}`)
    return res.data
  },

  getAvailableBanks: async (currency?: string) => {
    const res = await api.get<ApiResponse<any[]>>('/seller/payout/banks', {
      params: { currency },
    })
    return res.data
  },

  resolveBankAccount: async (data: { accountNumber: string; bankCode: string }) => {
    const res = await api.post<
      ApiResponse<{ accountNumber: string; accountName: string; bankId?: number }>
    >('/seller/payout/resolve-account', data)
    return res.data
  },

  getSellerLedger: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<any[]>>('/seller/payout/ledger', { params })
    return res.data
  },

  // ─── KYC & Store Onboarding ────────────────────────────────────────────────
  getKycStatus: async () => {
    const res = await api.get<
      ApiResponse<{
        kycStatus:
          | 'NOT_STARTED'
          | 'PENDING'
          | 'UNDER_REVIEW'
          | 'VERIFIED'
          | 'REJECTED'
          | 'REQUIRES_ACTION'
        isVerified: boolean
        storeCreated: boolean
        storeName: string
        storeSlug?: string
        storeDescription?: string
        storeCategory?: string
        storeLogo?: string
        accountStatus: string
        kycData?: Record<string, any>
      }>
    >('/seller/kyc')
    return res.data
  },

  submitKyc: async (data: {
    businessType: string
    legalName: string
    idType: string
    idNumber: string
    idDocumentUrl?: string
    proofOfAddressUrl?: string
    storeAddress?: Record<string, string>
    bankDetails: {
      bankCode: string
      bankName: string
      accountNumber: string
      accountName: string
    }
  }) => {
    const res = await api.post<ApiResponse<any>>('/seller/kyc/submit', data)
    return res.data
  },

  createStore: async (data: {
    storeName: string
    storeDescription?: string
    storeCategory?: string
    storeLogo?: string
    whatsappNumber?: string
  }) => {
    const res = await api.post<ApiResponse<any>>('/seller/store/create', data)
    return res.data
  },

  uploadStoreLogo: async (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    const res = await api.post<ApiResponse<{ url: string; storeLogo: string }>>(
      '/seller/store/upload-logo',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data
  },

  uploadKycDocument: async (file: File) => {
    const formData = new FormData()
    formData.append('document', file)
    const res = await api.post<
      ApiResponse<{ url: string; fileName: string; fileSize?: number; mimeType?: string }>
    >('/seller/kyc/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}
