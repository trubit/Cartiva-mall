import { useQuery, useMutation } from '@tanstack/react-query'
import { recommendationService } from '../services/recommendationService.js'
import type { BehaviorPayload } from '../../shared/types/recommendation.types.js'

export const REC_KEYS = {
  home: () => ['recommendations', 'home'] as const,
  bestSellers: (limit: number, category?: string) =>
    ['recommendations', 'best-sellers', limit, category ?? 'all'] as const,
  newArrivals: (limit: number) => ['recommendations', 'new-arrivals', limit] as const,
  fbt: (productId: string, limit: number) =>
    ['recommendations', 'fbt', productId, limit] as const,
  personalized: (limit: number) => ['recommendations', 'personalized', limit] as const,
}

export const useHomeRecommendations = () =>
  useQuery({
    queryKey: REC_KEYS.home(),
    queryFn: () => recommendationService.getHomeRecommendations(),
    staleTime: 3 * 60 * 1000,
  })

export const useBestSellers = (limit = 12, category?: string) =>
  useQuery({
    queryKey: REC_KEYS.bestSellers(limit, category),
    queryFn: () => recommendationService.getBestSellers(limit, category),
    staleTime: 10 * 60 * 1000,
  })

export const useNewArrivals = (limit = 12) =>
  useQuery({
    queryKey: REC_KEYS.newArrivals(limit),
    queryFn: () => recommendationService.getNewArrivals(limit),
    staleTime: 5 * 60 * 1000,
  })

export const useFrequentlyBoughtTogether = (productId: string, limit = 8) =>
  useQuery({
    queryKey: REC_KEYS.fbt(productId, limit),
    queryFn: () => recommendationService.getFrequentlyBoughtTogether(productId, limit),
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(productId),
  })

export const usePersonalizedRecommendations = (limit = 12) =>
  useQuery({
    queryKey: REC_KEYS.personalized(limit),
    queryFn: () => recommendationService.getPersonalized(limit),
    staleTime: 5 * 60 * 1000,
  })

export const useTrackBehavior = () =>
  useMutation({
    mutationFn: (payload: BehaviorPayload) => recommendationService.trackBehavior(payload),
    // Silently ignore tracking failures — never block UX
    onError: () => undefined,
  })
