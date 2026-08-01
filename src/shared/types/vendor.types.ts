export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'suspended'
export type CommissionStatus = 'pending' | 'calculated' | 'paid'

export interface IVendorSubscription {
  _id: string
  sellerId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startDate: string
  endDate: string
  monthlyFee: number
  productLimit: number
  commissionRate: number
  features: string[]
  createdAt: string
  updatedAt: string
}

export interface ICommission {
  _id: string
  orderId: { _id: string; orderNumber: string } | string
  sellerId: string
  saleAmount: number
  commissionRate: number
  commissionAmount: number
  platformAmount: number
  sellerEarning: number
  status: CommissionStatus
  periodStart: string
  periodEnd: string
  createdAt: string
  updatedAt: string
}

export interface VendorCommissionSummary {
  items: ICommission[]
  total: number
  page: number
  pages: number
  summary: {
    totalSales: number
    totalCommission: number
    totalEarnings: number
  }
}
