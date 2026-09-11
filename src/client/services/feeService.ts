import api from './api.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

export interface ISellerFeeItem {
  _id: string
  feeNumber: string
  orderNumber: string
  quantity: number
  baseFeeAmount: number
  baseFeeCurrency: string
  feePerUnit: number
  totalFee: number
  currency: string
  status: string
  createdAt: string
  productId?: {
    _id: string
    title: string
    image?: string
    price: number
  }
}

export interface IFeeSummary {
  accountStatus: string
  totalSales: number
  totalEarnings: number
  totalCommission: number
  recentSales?: Array<{
    amount: number
    currency: string
    description: string
    createdAt: string
  }>
}

export interface IFeeLedgerResponse {
  fees: ISellerFeeItem[]
  commissions?: ISellerFeeItem[]
  summary: IFeeSummary
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface IAdminCommissionAnalytics {
  byCurrency: Array<{
    currency: string
    totalCommission: number
    totalUnitsSold: number
    orderCount: number
  }>
  totalCommissionsCount: number
  recentCommissions: ISellerFeeItem[]
}

export const feeService = {
  getMyFees: async (query?: { page?: number; limit?: number; status?: string }) => {
    const params = new URLSearchParams()
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    if (query?.status) params.set('status', query.status)

    const res = await api.get<ApiResponse<IFeeLedgerResponse>>(`/fees/my-fees?${params.toString()}`)
    return res.data
  },

  getAdminCommissions: async (query?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams()
    if (query?.startDate) params.set('startDate', query.startDate)
    if (query?.endDate) params.set('endDate', query.endDate)

    const res = await api.get<ApiResponse<IAdminCommissionAnalytics>>(
      `/fees/admin/commissions?${params.toString()}`,
    )
    return res.data
  },
}
