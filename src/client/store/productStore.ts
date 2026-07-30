import { create } from 'zustand'
import type { IProduct, ProductFilters } from '../../shared/types/product.types.js'

interface ProductStore {
  selectedProduct: IProduct | null
  setSelectedProduct: (product: IProduct | null) => void

  filters: ProductFilters
  setFilters: (filters: Partial<ProductFilters>) => void
  resetFilters: () => void
}

const defaultFilters: ProductFilters = {
  sort: 'newest',
  page: 1,
  limit: 20,
}

export const useProductStore = create<ProductStore>()((set) => ({
  selectedProduct: null,
  setSelectedProduct: (product) => set({ selectedProduct: product }),

  filters: defaultFilters,
  setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial, page: 1 } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
