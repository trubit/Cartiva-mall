import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorService } from '../services/vendorService'
import type { SubscriptionPlan } from '../../shared/types/vendor.types.js'

export const useMySubscription = () =>
  useQuery({
    queryKey: ['vendor', 'subscription'],
    queryFn: () => vendorService.getMySubscription(),
    select: (res) => res.data.data,
  })

export const useSubscribe = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: SubscriptionPlan) => vendorService.subscribe(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'subscription'] }),
  })
}

export const useCancelSubscription = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => vendorService.cancelSubscription(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'subscription'] }),
  })
}

export const useMyCommissions = (page = 1) =>
  useQuery({
    queryKey: ['vendor', 'commissions', page],
    queryFn: () => vendorService.getMyCommissions(page),
    select: (res) => res.data.data,
  })

export const useAdminVendorList = (page = 1) =>
  useQuery({
    queryKey: ['vendor', 'admin', 'list', page],
    queryFn: () => vendorService.listVendors(page),
    select: (res) => res.data.data,
  })

export const useSuspendVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, reason }: { sellerId: string; reason?: string }) =>
      vendorService.suspendVendor(sellerId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'admin'] }),
  })
}

export const useReinstateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sellerId: string) => vendorService.reinstateVendor(sellerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'admin'] }),
  })
}
