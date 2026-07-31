import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { productService } from '../services/productService.js'
import type { ProductFilters } from '../../shared/types/product.types.js'

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_KEYS.all, 'list'] as const,
  list: (f: ProductFilters) => [...PRODUCT_KEYS.lists(), f] as const,
  featured: () => [...PRODUCT_KEYS.all, 'featured'] as const,
  trending: () => [...PRODUCT_KEYS.all, 'trending'] as const,
  recommended: () => [...PRODUCT_KEYS.all, 'recommended'] as const,
  related: (id: string) => [...PRODUCT_KEYS.all, 'related', id] as const,
  categories: () => [...PRODUCT_KEYS.all, 'categories'] as const,
  brands: (cat?: string) => [...PRODUCT_KEYS.all, 'brands', cat ?? 'all'] as const,
  suggestions: (q: string) => [...PRODUCT_KEYS.all, 'suggestions', q] as const,
  detail: (id: string) => [...PRODUCT_KEYS.all, 'detail', id] as const,
  search: (q: string, f: ProductFilters) => [...PRODUCT_KEYS.all, 'search', q, f] as const,
  category: (cat: string, f: ProductFilters) => [...PRODUCT_KEYS.all, 'category', cat, f] as const,
  seller: (f: ProductFilters) => [...PRODUCT_KEYS.all, 'seller', f] as const,
  reviews: (id: string, page: number) => [...PRODUCT_KEYS.all, 'reviews', id, page] as const,
  questions: (id: string) => [...PRODUCT_KEYS.all, 'questions', id] as const,
}

// ── Product list ──────────────────────────────────────────────────────────────
export const useProducts = (filters: ProductFilters = {}) =>
  useQuery({
    queryKey: PRODUCT_KEYS.list(filters),
    queryFn: () => productService.getProducts(filters),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })

// ── Featured ──────────────────────────────────────────────────────────────────
export const useFeaturedProducts = (limit = 12) =>
  useQuery({
    queryKey: PRODUCT_KEYS.featured(),
    queryFn: () => productService.getFeatured(limit),
    staleTime: 5 * 60 * 1000,
  })

// ── Trending ──────────────────────────────────────────────────────────────────
export const useTrendingProducts = (limit = 12) =>
  useQuery({
    queryKey: PRODUCT_KEYS.trending(),
    queryFn: () => productService.getTrending(limit),
    staleTime: 2 * 60 * 1000,
  })

// ── Recommended ───────────────────────────────────────────────────────────────
export const useRecommendedProducts = (limit = 12) =>
  useQuery({
    queryKey: PRODUCT_KEYS.recommended(),
    queryFn: () => productService.getRecommended(limit),
    staleTime: 5 * 60 * 1000,
  })

// ── Related ───────────────────────────────────────────────────────────────────
export const useRelatedProducts = (productId: string, limit = 8) =>
  useQuery({
    queryKey: PRODUCT_KEYS.related(productId),
    queryFn: () => productService.getRelated(productId, limit),
    enabled: !!productId,
    staleTime: 3 * 60 * 1000,
  })

// ── Categories ────────────────────────────────────────────────────────────────
export const useCategories = () =>
  useQuery({
    queryKey: PRODUCT_KEYS.categories(),
    queryFn: () => productService.getCategories(),
    staleTime: 10 * 60 * 1000,
  })

// ── Brands ────────────────────────────────────────────────────────────────────
export const useBrands = (category?: string) =>
  useQuery({
    queryKey: PRODUCT_KEYS.brands(category),
    queryFn: () => productService.getBrands(category),
    staleTime: 10 * 60 * 1000,
  })

// ── Suggestions (autocomplete) ────────────────────────────────────────────────
export const useProductSuggestions = (q: string) =>
  useQuery({
    queryKey: PRODUCT_KEYS.suggestions(q),
    queryFn: () => productService.getSuggestions(q),
    enabled: q.trim().length >= 2,
    staleTime: 60 * 1000,
  })

// ── Single product ────────────────────────────────────────────────────────────
export const useProduct = (id: string) =>
  useQuery({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })

// ── Search ────────────────────────────────────────────────────────────────────
export const useSearchProducts = (q: string, filters: ProductFilters = {}) =>
  useQuery({
    queryKey: PRODUCT_KEYS.search(q, filters),
    queryFn: () => productService.searchProducts(q, filters),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
  })

// ── By category ───────────────────────────────────────────────────────────────
export const useCategoryProducts = (category: string, filters: ProductFilters = {}) =>
  useQuery({
    queryKey: PRODUCT_KEYS.category(category, filters),
    queryFn: () => productService.getByCategory(category, filters),
    enabled: !!category,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })

// ── Seller own products ───────────────────────────────────────────────────────
export const useSellerProducts = (filters: ProductFilters = {}) =>
  useQuery({
    queryKey: PRODUCT_KEYS.seller(filters),
    queryFn: () => productService.getSellerProducts(filters),
    placeholderData: keepPreviousData,
  })

// ── Reviews ───────────────────────────────────────────────────────────────────
export const useProductReviews = (productId: string, page = 1) =>
  useQuery({
    queryKey: PRODUCT_KEYS.reviews(productId, page),
    queryFn: () => productService.getReviews(productId, page),
    enabled: !!productId,
    placeholderData: keepPreviousData,
  })

// ── Mutations ─────────────────────────────────────────────────────────────────
export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      productService.updateProduct(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.detail(id) })
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() })
    },
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  })
}

export const useAddReview = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { rating: number; title?: string; body: string }) =>
      productService.addReview(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.reviews(productId, 1) })
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.detail(productId) })
    },
  })
}

export const useDeleteReview = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => productService.deleteReview(productId, reviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.reviews(productId, 1) })
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.detail(productId) })
    },
  })
}

export const useVoteHelpful = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => productService.voteHelpful(productId, reviewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.reviews(productId, 1) }),
  })
}

export const useReportReview = (productId: string) =>
  useMutation({
    mutationFn: (reviewId: string) => productService.reportReview(productId, reviewId),
  })

// ── Q&A ───────────────────────────────────────────────────────────────────────
export const useQuestions = (productId: string) =>
  useQuery({
    queryKey: PRODUCT_KEYS.questions(productId),
    queryFn: () => productService.getQuestions(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  })

export const useAddQuestion = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (question: string) => productService.addQuestion(productId, question),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.questions(productId) }),
  })
}

export const useAddAnswer = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      productService.addAnswer(productId, questionId, answer),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.questions(productId) }),
  })
}
