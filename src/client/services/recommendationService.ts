import api from './api.js'
import type { IProduct } from '../../shared/types/product.types.js'
import type {
  BehaviorPayload,
  IHomeRecommendations,
} from '../../shared/types/recommendation.types.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

export const recommendationService = {
  getHomeRecommendations: async (): Promise<IHomeRecommendations> => {
    const res = await api.get<ApiResponse<IHomeRecommendations>>('/recommendations/home')
    return (
      res.data.data ?? { bestSellers: [], newArrivals: [], personalizedForYou: [] }
    )
  },

  getBestSellers: async (limit = 12, category?: string): Promise<IProduct[]> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (category) params.set('category', category)
    const res = await api.get<ApiResponse<IProduct[]>>(`/recommendations/best-sellers?${params}`)
    return res.data.data ?? []
  },

  getNewArrivals: async (limit = 12): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/recommendations/new-arrivals?limit=${limit}`,
    )
    return res.data.data ?? []
  },

  getFrequentlyBoughtTogether: async (productId: string, limit = 8): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/recommendations/frequently-bought-together/${productId}?limit=${limit}`,
    )
    return res.data.data ?? []
  },

  getPersonalized: async (limit = 12): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/recommendations/personalized?limit=${limit}`,
    )
    return res.data.data ?? []
  },

  trackBehavior: async (payload: BehaviorPayload): Promise<void> => {
    await api.post('/recommendations/behavior', payload)
  },
}
