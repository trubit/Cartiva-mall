import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../services/analyticsService.js'

export const useAnalyticsDashboard = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'dashboard', params],
    queryFn: () => analyticsApi.getDashboard(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsSales = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'sales', params],
    queryFn: () => analyticsApi.getSales(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsCustomers = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'customers', params],
    queryFn: () => analyticsApi.getCustomers(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsVendors = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'vendors', params],
    queryFn: () => analyticsApi.getVendors(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsProducts = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'products', params],
    queryFn: () => analyticsApi.getProducts(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsInventory = () =>
  useQuery({
    queryKey: ['analytics', 'inventory'],
    queryFn: () => analyticsApi.getInventory().then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsLogistics = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'logistics', params],
    queryFn: () => analyticsApi.getLogistics(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsFinance = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'finance', params],
    queryFn: () => analyticsApi.getFinance(params).then((r) => r.data.data),
    staleTime: 120000,
    retry: false,
  })

export const useAnalyticsReports = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['analytics', 'reports', params],
    queryFn: () => analyticsApi.listReports(params).then((r) => r.data),
    retry: false,
  })

export const useCreateAnalyticsReport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => analyticsApi.createReport(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics', 'reports'] }),
  })
}
