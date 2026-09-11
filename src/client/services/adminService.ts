import api from './api.js'
import type { IUser } from '../../shared/types/user.types.js'
import type { IProduct } from '../../shared/types/product.types.js'
import type { IOrder, OrderStatus } from '../../shared/types/order.types.js'
import type { UserRole } from '../../shared/types/auth.types.js'

export interface AdminStats {
  users: { total: number; buyers: number; sellers: number; admins: number }
  sellers: { total: number }
  products: { total: number; pending: number; active: number; blocked: number }
  orders: {
    total: number
    pending: number
    confirmed: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    refunded: number
  }
  revenue: { total: number }
  revenueByDay: { _id: string; revenue: number; orders: number }[]
  recentOrders: IOrder[]
}

export interface AdminSeller {
  _id: string
  storeName: string
  storeLogo: string
  storeDescription: string
  isVerified: boolean
  totalSales: number
  totalEarnings: number
  rating: number
  createdAt: string
  userId?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    username: string
    isActive: boolean
  }
}

export interface KycBankDetails {
  bankCode?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  isResolved?: boolean
}

export interface AdminSellerKycProfile {
  _id: string
  userId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phoneNumber?: string
    profileImage?: string
    createdAt: string
  }
  storeName: string
  storeCategory?: string
  storeDescription?: string
  storeSlug?: string
  kycStatus:
    | 'NOT_STARTED'
    | 'PENDING'
    | 'UNDER_REVIEW'
    | 'VERIFIED'
    | 'REJECTED'
    | 'REQUIRES_ACTION'
  isVerified: boolean
  storeCreated: boolean
  kycData?: {
    businessType?: string
    legalName?: string
    idType?: string
    idNumber?: string
    idDocumentUrl?: string
    proofOfAddressUrl?: string
    bankDetails?: KycBankDetails
    submittedAt?: string
    reviewedAt?: string
    reviewedBy?: string
    rejectionReason?: string
    actionRequiredReason?: string
  }
  createdAt: string
  updatedAt: string
}

export interface AdminPayment {
  _id: string
  paymentIntentId: string
  paymentMethod: string
  currency: string
  amount: number
  status: string
  createdAt: string
  userId?: { firstName: string; lastName: string; email: string }
  orderId?: { orderNumber: string; grandTotal: number }
}

export interface FraudAlert {
  _id: string
  type: string
  ruleType: string
  severity: 'high' | 'medium' | 'low'
  name: string
  email: string
  description: string
  orderCount?: number
  failureCount?: number
  grandTotal?: number
}

export interface PlatformAnalytics {
  revenueByDay: { _id: string; revenue: number; orders: number }[]
  categoryBreakdown: { _id: string; revenue: number; sold: number }[]
  topSellers: { _id: string; name: string; email: string; revenue: number; orders: number }[]
  topProducts: { _id: string; title: string; image: string; revenue: number; unitsSold: number }[]
  userGrowth: { _id: string; users: number }[]
  orderFulfillment: { _id: string; count: number }[]
  summary: { currentRevenue: number; prevRevenue: number; revenueGrowth: number }
}

export interface AdminReport {
  period: string
  since: string
  revenue: { total: number; count: number; avgValue: number; minValue: number; maxValue: number }
  orders: Record<string, number>
  newUsers: Record<string, number>
  categories: { _id: string; revenue: number; sold: number }[]
  topSellers: { storeName: string; isVerified: boolean; orderCount: number }[]
}

export interface AuditLog {
  _id: string
  action: string
  targetType: string
  targetId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  ip: string
  createdAt: string
  adminId?: { firstName: string; lastName: string; email: string }
}

interface PagedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export const adminService = {
  // ── Dashboard
  getStats: (): Promise<{ success: boolean; message: string; data: AdminStats }> =>
    api.get('/admin/stats').then((r) => r.data),

  // ── Users
  getUsers: (params?: Record<string, string>): Promise<PagedResponse<IUser>> =>
    api
      .get('/admin/users', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  toggleUserActive: (id: string): Promise<IUser> =>
    api.patch(`/admin/users/${id}/toggle-active`).then((r) => r.data.data),

  changeUserRole: (id: string, role: UserRole): Promise<IUser> =>
    api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data.data),

  deleteUser: (id: string): Promise<void> => api.delete(`/admin/users/${id}`).then(() => undefined),

  // ── Sellers
  getSellers: (params?: Record<string, string>): Promise<PagedResponse<AdminSeller>> =>
    api
      .get('/admin/sellers', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  verifySeller: (id: string): Promise<AdminSeller> =>
    api.patch(`/admin/sellers/${id}/verify`).then((r) => r.data.data),

  getPendingKycSellers: (
    params?: Record<string, string>,
  ): Promise<PagedResponse<AdminSellerKycProfile>> =>
    api
      .get('/admin/sellers/kyc/pending', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  reviewSellerKyc: (
    sellerId: string,
    data: {
      action: 'APPROVE' | 'REJECT' | 'REQUEST_ACTION'
      rejectionReason?: string
      actionRequiredReason?: string
    },
  ): Promise<AdminSellerKycProfile> =>
    api.put(`/admin/sellers/${sellerId}/kyc/review`, data).then((r) => r.data.data),

  // ── Products
  getProducts: (params?: Record<string, string>): Promise<PagedResponse<IProduct>> =>
    api
      .get('/admin/products', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  approveProduct: (id: string): Promise<IProduct> =>
    api.put(`/admin/products/${id}/approve`).then((r) => r.data.data),

  blockProduct: (id: string): Promise<IProduct> =>
    api.put(`/admin/products/${id}/block`).then((r) => r.data.data),

  // ── Orders
  getOrders: (params?: Record<string, string>): Promise<PagedResponse<IOrder>> =>
    api
      .get('/admin/orders', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  updateOrderStatus: (id: string, orderStatus: OrderStatus): Promise<IOrder> =>
    api.patch(`/admin/orders/${id}/status`, { orderStatus }).then((r) => r.data.data),

  // ── Payments
  getPayments: (params?: Record<string, string>): Promise<PagedResponse<AdminPayment>> =>
    api
      .get('/admin/payments', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  // ── Analytics
  getAnalytics: (days = 30): Promise<{ success: boolean; data: PlatformAnalytics }> =>
    api.get('/admin/analytics', { params: { days: String(days) } }).then((r) => r.data),

  // ── Fraud alerts
  getFraudAlerts: (): Promise<{
    success: boolean
    data: { alerts: FraudAlert[]; total: number }
  }> => api.get('/admin/fraud-alerts').then((r) => r.data),

  // ── Reports
  getReports: (period = 'month'): Promise<{ success: boolean; data: AdminReport }> =>
    api.get('/admin/reports', { params: { period } }).then((r) => r.data),

  // ── Audit logs
  getAuditLogs: (params?: Record<string, string>): Promise<PagedResponse<AuditLog>> =>
    api
      .get('/admin/audit-logs', { params })
      .then((r) => ({ data: r.data.data, pagination: r.data.pagination })),

  // ── Commission policy
  getCommissionPolicy: (): Promise<{ success: boolean; data: MarketplaceCommissionPolicy }> =>
    api.get('/fees/admin/commission-policy').then((r) => r.data),

  updateCommissionPolicy: (
    payload: UpdateCommissionPolicyPayload,
  ): Promise<{ success: boolean; data: MarketplaceCommissionPolicy }> =>
    api.put('/fees/admin/commission-policy', payload).then((r) => r.data),
}

export interface CommissionAuditLog {
  modifiedBy: string
  modifierEmail?: string
  previousState?: Record<string, any>
  newState?: Record<string, any>
  reason?: string
  timestamp: string
}

export interface MarketplaceCommissionPolicy {
  _id: string
  baseSellerFee: number
  baseCurrency: string
  commissionType: 'FLAT_PER_UNIT' | 'PERCENTAGE' | 'HYBRID'
  percentageRate: number
  currencyRates: Record<string, number>
  baseUsdRate: number
  isActive: boolean
  version: number
  lastModifiedBy?: string
  auditTrail: CommissionAuditLog[]
  createdAt: string
  updatedAt: string
}

export interface UpdateCommissionPolicyPayload {
  baseSellerFee: number
  baseCurrency?: string
  commissionType?: 'FLAT_PER_UNIT' | 'PERCENTAGE' | 'HYBRID'
  percentageRate?: number
  currencyRates?: Record<string, number>
  baseUsdRate?: number
  reason?: string
}
