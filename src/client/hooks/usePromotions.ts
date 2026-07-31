import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotionService } from '../services/promotionService.js'
import type { ICoupon, IPromotion } from '../../shared/types/promotion.types.js'

export const PROMO_KEYS = {
  all: ['promotions'] as const,
  active: () => [...PROMO_KEYS.all, 'active'] as const,
  adminCoupons: (page: number) => [...PROMO_KEYS.all, 'admin-coupons', page] as const,
  adminPromos: (page: number) => [...PROMO_KEYS.all, 'admin-promos', page] as const,
}

// ── Public ────────────────────────────────────────────────────────────────────
export const useActivePromotions = () =>
  useQuery({
    queryKey: PROMO_KEYS.active(),
    queryFn: promotionService.getActivePromotions,
    staleTime: 5 * 60 * 1000,
  })

// ── Admin Coupons ─────────────────────────────────────────────────────────────
export const useAdminCoupons = (page = 1) =>
  useQuery({
    queryKey: PROMO_KEYS.adminCoupons(page),
    queryFn: () => promotionService.getCoupons(page),
    staleTime: 60 * 1000,
  })

export const useCreateCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ICoupon>) => promotionService.createCoupon(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

export const useUpdateCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ICoupon> }) =>
      promotionService.updateCoupon(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

export const useDeleteCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.deleteCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

export const useToggleCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.toggleCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

// ── Admin Promotions ──────────────────────────────────────────────────────────
export const useAdminPromotions = (page = 1) =>
  useQuery({
    queryKey: PROMO_KEYS.adminPromos(page),
    queryFn: () => promotionService.getPromotions(page),
    staleTime: 60 * 1000,
  })

export const useCreatePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<IPromotion>) => promotionService.createPromotion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

export const useUpdatePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IPromotion> }) =>
      promotionService.updatePromotion(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

export const useDeletePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}

export const useTogglePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.togglePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO_KEYS.all }),
  })
}
