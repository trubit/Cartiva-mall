import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '../services/adminService.js'
import type { OrderStatus } from '../../shared/types/order.types.js'
import type { UserRole } from '../../shared/types/auth.types.js'

const KEYS = {
  stats: ['admin', 'stats'] as const,
  users: (p: Record<string, string>) => ['admin', 'users', p] as const,
  sellers: (p: Record<string, string>) => ['admin', 'sellers', p] as const,
  products: (p: Record<string, string>) => ['admin', 'products', p] as const,
  orders: (p: Record<string, string>) => ['admin', 'orders', p] as const,
  payments: (p: Record<string, string>) => ['admin', 'payments', p] as const,
  analytics: (days: number) => ['admin', 'analytics', days] as const,
  fraudAlerts: ['admin', 'fraud-alerts'] as const,
  reports: (period: string) => ['admin', 'reports', period] as const,
  auditLogs: (p: Record<string, string>) => ['admin', 'audit-logs', p] as const,
  commissionPolicy: ['admin', 'commission-policy'] as const,
}

// ── Stats
export const useAdminStats = () =>
  useQuery({
    queryKey: KEYS.stats,
    queryFn: adminService.getStats,
    staleTime: 60_000,
  })

// ── Users
export const useAdminUsers = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: KEYS.users(params),
    queryFn: () => adminService.getUsers(params),
    staleTime: 30_000,
  })

export const useToggleUserActive = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.toggleUserActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export const useChangeUserRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      adminService.changeUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ── Sellers
export const useAdminSellers = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: KEYS.sellers(params),
    queryFn: () => adminService.getSellers(params),
    staleTime: 30_000,
  })

export const useVerifySeller = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.verifySeller(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sellers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export const useAdminKycSellers = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: ['admin', 'sellers', 'kyc', params],
    queryFn: () => adminService.getPendingKycSellers(params),
    staleTime: 15_000,
  })

export const useReviewSellerKyc = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sellerId,
      data,
    }: {
      sellerId: string
      data: {
        action: 'APPROVE' | 'REJECT' | 'REQUEST_ACTION'
        rejectionReason?: string
        actionRequiredReason?: string
      }
    }) => adminService.reviewSellerKyc(sellerId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'sellers'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'kyc-status'] })
    },
  })
}

// ── Products
export const useAdminProducts = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: KEYS.products(params),
    queryFn: () => adminService.getProducts(params),
    staleTime: 30_000,
  })

export const useApproveProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.approveProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export const useBlockProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.blockProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ── Orders
export const useAdminOrders = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: KEYS.orders(params),
    queryFn: () => adminService.getOrders(params),
    staleTime: 30_000,
  })

export const useAdminUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, orderStatus }: { id: string; orderStatus: OrderStatus }) =>
      adminService.updateOrderStatus(id, orderStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ── Payments
export const useAdminPayments = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: KEYS.payments(params),
    queryFn: () => adminService.getPayments(params),
    staleTime: 30_000,
  })

// ── Analytics
export const useAdminAnalytics = (days = 30) =>
  useQuery({
    queryKey: KEYS.analytics(days),
    queryFn: () => adminService.getAnalytics(days),
    staleTime: 5 * 60_000,
  })

// ── Fraud alerts
export const useAdminFraudAlerts = () =>
  useQuery({
    queryKey: KEYS.fraudAlerts,
    queryFn: adminService.getFraudAlerts,
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  })

// ── Reports
export const useAdminReports = (period = 'month') =>
  useQuery({
    queryKey: KEYS.reports(period),
    queryFn: () => adminService.getReports(period),
    staleTime: 10 * 60_000,
  })

// ── Audit logs
export const useAdminAuditLogs = (params: Record<string, string> = {}) =>
  useQuery({
    queryKey: KEYS.auditLogs(params),
    queryFn: () => adminService.getAuditLogs(params),
    staleTime: 30_000,
  })

// ── Commission policy
export const useAdminCommissionPolicy = () =>
  useQuery({
    queryKey: KEYS.commissionPolicy,
    queryFn: adminService.getCommissionPolicy,
    staleTime: 30_000,
  })

export const useUpdateCommissionPolicy = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminService.updateCommissionPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.commissionPolicy })
    },
  })
}
