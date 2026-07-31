import api from './api.js'
import type {
  IProduct,
  IReview,
  IQuestion,
  ProductFilters,
} from '../../shared/types/product.types.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

interface ProductsResponse {
  data: IProduct[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const toQuery = (filters: ProductFilters): URLSearchParams => {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  })
  return p
}

export const productService = {
  getProducts: async (filters: ProductFilters = {}): Promise<ProductsResponse> => {
    const res = await api.get<ApiResponse<IProduct[]>>(`/products?${toQuery(filters)}`)
    return {
      data: res.data.data ?? [],
      pagination: res.data.pagination as ProductsResponse['pagination'],
    }
  },

  getFeatured: async (limit = 12): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(`/products/featured?limit=${limit}`)
    return res.data.data ?? []
  },

  getProductById: async (id: string): Promise<IProduct> => {
    const res = await api.get<ApiResponse<IProduct>>(`/products/${id}`)
    return res.data.data!
  },

  searchProducts: async (q: string, filters: ProductFilters = {}): Promise<ProductsResponse> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/products/search?q=${encodeURIComponent(q)}&${toQuery(filters)}`,
    )
    return {
      data: res.data.data ?? [],
      pagination: res.data.pagination as ProductsResponse['pagination'],
    }
  },

  getByCategory: async (
    category: string,
    filters: ProductFilters = {},
  ): Promise<ProductsResponse> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/products/category/${encodeURIComponent(category)}?${toQuery(filters)}`,
    )
    return {
      data: res.data.data ?? [],
      pagination: res.data.pagination as ProductsResponse['pagination'],
    }
  },

  getSellerProducts: async (filters: ProductFilters = {}): Promise<ProductsResponse> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/products/seller/my-products?${toQuery(filters)}`,
    )
    return {
      data: res.data.data ?? [],
      pagination: res.data.pagination as ProductsResponse['pagination'],
    }
  },

  createProduct: async (data: FormData | Record<string, unknown>): Promise<IProduct> => {
    const res = await api.post<ApiResponse<IProduct>>('/products/create', data)
    return res.data.data!
  },

  updateProduct: async (id: string, data: Record<string, unknown>): Promise<IProduct> => {
    const res = await api.put<ApiResponse<IProduct>>(`/products/update/${id}`, data)
    return res.data.data!
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/delete/${id}`)
  },

  approveProduct: async (id: string): Promise<IProduct> => {
    const res = await api.put<ApiResponse<IProduct>>(`/products/approve/${id}`)
    return res.data.data!
  },

  blockProduct: async (id: string): Promise<IProduct> => {
    const res = await api.put<ApiResponse<IProduct>>(`/products/block/${id}`)
    return res.data.data!
  },

  addReview: async (
    productId: string,
    data: { rating: number; title?: string; body: string },
  ): Promise<IReview> => {
    const res = await api.post<ApiResponse<IReview>>(`/products/${productId}/review`, data)
    return res.data.data!
  },

  getReviews: async (
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: IReview[]; pagination: ProductsResponse['pagination'] }> => {
    const res = await api.get<ApiResponse<IReview[]>>(
      `/products/${productId}/reviews?page=${page}&limit=${limit}`,
    )
    return {
      data: res.data.data ?? [],
      pagination: res.data.pagination as ProductsResponse['pagination'],
    }
  },

  deleteReview: async (productId: string, reviewId: string): Promise<void> => {
    await api.delete(`/products/${productId}/reviews/${reviewId}`)
  },

  voteHelpful: async (
    productId: string,
    reviewId: string,
  ): Promise<{ helpfulCount: number; voted: boolean }> => {
    const res = await api.post<ApiResponse<{ helpfulCount: number; voted: boolean }>>(
      `/products/${productId}/reviews/${reviewId}/helpful`,
    )
    return res.data.data!
  },

  reportReview: async (productId: string, reviewId: string): Promise<void> => {
    await api.post(`/products/${productId}/reviews/${reviewId}/report`)
  },

  getQuestions: async (productId: string): Promise<IQuestion[]> => {
    const res = await api.get<ApiResponse<IQuestion[]>>(`/products/${productId}/questions`)
    return res.data.data ?? []
  },

  addQuestion: async (productId: string, question: string): Promise<IQuestion> => {
    const res = await api.post<ApiResponse<IQuestion>>(`/products/${productId}/questions`, {
      question,
    })
    return res.data.data!
  },

  addAnswer: async (productId: string, questionId: string, answer: string): Promise<IQuestion> => {
    const res = await api.post<ApiResponse<IQuestion>>(
      `/products/${productId}/questions/${questionId}/answers`,
      { answer },
    )
    return res.data.data!
  },

  getTrending: async (limit = 12): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(`/products/trending?limit=${limit}`)
    return res.data.data ?? []
  },

  getRecommended: async (limit = 12): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(`/products/recommended?limit=${limit}`)
    return res.data.data ?? []
  },

  getRelated: async (productId: string, limit = 8): Promise<IProduct[]> => {
    const res = await api.get<ApiResponse<IProduct[]>>(
      `/products/${productId}/related?limit=${limit}`,
    )
    return res.data.data ?? []
  },

  getCategories: async (): Promise<{ category: string; count: number }[]> => {
    const res =
      await api.get<ApiResponse<{ category: string; count: number }[]>>('/products/categories')
    return res.data.data ?? []
  },

  getBrands: async (category?: string): Promise<{ brand: string; count: number }[]> => {
    const url = category
      ? `/products/brands?category=${encodeURIComponent(category)}`
      : '/products/brands'
    const res = await api.get<ApiResponse<{ brand: string; count: number }[]>>(url)
    return res.data.data ?? []
  },

  getSuggestions: async (q: string): Promise<string[]> => {
    if (!q || q.trim().length < 2) return []
    const res = await api.get<ApiResponse<string[]>>(
      `/products/suggestions?q=${encodeURIComponent(q)}`,
    )
    return res.data.data ?? []
  },
}
