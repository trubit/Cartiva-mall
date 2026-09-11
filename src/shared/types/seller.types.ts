export interface ISellerAddress {
  country?: string
  state?: string
  city?: string
  street?: string
  postalCode?: string
}

export interface ISellerProfile {
  _id: string
  userId: string
  storeName: string
  storeLogo: string
  storeLogoPublicId?: string
  storeDescription: string
  storeAddress: ISellerAddress
  isVerified: boolean
  totalSales: number
  totalEarnings: number
  rating: number
  createdAt: string
  updatedAt: string
}

export interface IRevenueByDay {
  _id: string
  revenue: number
  orders: number
}

export interface ITopProduct {
  _id: string
  title: string
  image?: string
  totalSold: number
  totalRevenue: number
}

export interface ISellerRecentOrder {
  _id: string
  orderNumber: string
  orderStatus: string
  paymentStatus: string
  grandTotal: number
  createdAt: string
  userId?: {
    firstName: string
    lastName: string
    email: string
  }
}

export interface ISellerDashboard {
  stats: {
    totalRevenue: number
    totalOrders: number
    totalProducts: number
    activeProducts: number
    pendingOrders: number
    thisMonthRevenue: number
  }
  products: {
    active: number
    pending: number
    blocked: number
  }
  recentOrders: ISellerRecentOrder[]
  revenueByDay: IRevenueByDay[]
  orderStatusBreakdown: { _id: string; count: number }[]
  topProducts: ITopProduct[]
}

export interface ISellerAnalytics {
  revenueByDay: IRevenueByDay[]
  orderStatusBreakdown: { _id: string; count: number }[]
  topProducts: ITopProduct[]
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
}

export interface ISellerEarnings {
  totalRevenue: number
  netRevenue: number
  platformFeePercent: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  pendingBalance: number
  availableBalance: number
  withdrawnTotal?: number
  inFlightWithdrawals?: number
  settledRevenue?: number
  currency?: string
  revenueByMonth: { _id: string; revenue: number; orders: number }[]
}

export interface ISellerPayoutAccount {
  _id: string
  sellerId: string
  accountType: 'bank_account'
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  recipientCode?: string
  currency: string
  isDefault: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export type SellerWithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'reversed'

export interface ISellerWithdrawal {
  _id: string
  withdrawalNumber: string
  sellerId: string
  amount: number
  fee: number
  netAmount: number
  currency: string
  status: SellerWithdrawalStatus
  payoutMethod: 'paystack' | 'stripe' | 'manual'
  payoutAccount: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
    recipientCode?: string
  }
  providerReference?: string
  providerTransferCode?: string
  failureReason?: string
  requestedAt: string
  processedAt?: string
  completedAt?: string
  auditLog?: Array<{
    status: string
    note?: string
    timestamp: string
  }>
  createdAt: string
  updatedAt: string
}

export interface ISellerLedgerEntry {
  _id: string
  sellerId: string
  type:
    | 'ORDER_SALE'
    | 'COMMISSION_DEDUCTION'
    | 'ORDER_REFUND'
    | 'EARNING_RELEASE'
    | 'WITHDRAWAL_RESERVE'
    | 'WITHDRAWAL_SETTLED'
    | 'WITHDRAWAL_REVERSED'
    | 'ADJUSTMENT'
  amount: number
  currency: string
  balanceAfter: number
  referenceType: 'order' | 'withdrawal' | 'refund' | 'admin_adjustment'
  referenceId: string
  description: string
  createdAt: string
}
