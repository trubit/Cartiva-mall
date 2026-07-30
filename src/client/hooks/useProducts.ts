import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { productService } from '../services/productService.js'
import type { ProductFilters } from '../../shared/types/product.types.js'

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_KEYS.all, 'list'] as const,
  list: (f: ProductFilters) => [...PRODUCT_KEYS.lists(), f] as const,
  featured: () => [...PRODUCT_KEYS.all, 'featured'] as const,
  detail: (id: string) => [...PRODUCT_KEYS.all, 'detail', id] as const,
  search: (q: string, f: ProductFilters) => [...PRODUCT_KEYS.all, 'search', q, f] as const,
  category: (cat: string, f: ProductFilters) => [...PRODUCT_KEYS.all, 'category', cat, f] as const,
  seller: (f: ProductFilters) => [...PRODUCT_KEYS.all, 'seller', f] as const,
  reviews: (id: string, page: number) => [...PRODUCT_KEYS.all, 'reviews', id, page] as const,
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
