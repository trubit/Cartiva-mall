import { create } from 'zustand'
import type { IOrder, IOrderTracking } from '../../shared/types/index.js'

interface OrderState {
  orders: IOrder[]
  selectedOrder: IOrder | null
  trackingData: IOrderTracking | null
  returnStatus: 'idle' | 'submitting' | 'success' | 'error'
  returnError: string | null
  filters: {
    status?: string
    page: number
    limit: number
  }
}

interface OrderActions {
  setOrders: (orders: IOrder[]) => void
  setSelectedOrder: (order: IOrder | null) => void
  updateOrderInList: (order: IOrder) => void
  setTrackingData: (data: IOrderTracking | null) => void
  setReturnStatus: (status: OrderState['returnStatus']) => void
  setReturnError: (err: string | null) => void
  setFilters: (partial: Partial<OrderState['filters']>) => void
  resetFilters: () => void
  clearAll: () => void
}

const DEFAULT_FILTERS: OrderState['filters'] = { page: 1, limit: 20 }

export const useOrderStore = create<OrderState & OrderActions>()((set) => ({
  orders: [],
  selectedOrder: null,
  trackingData: null,
  returnStatus: 'idle',
  returnError: null,
  filters: { ...DEFAULT_FILTERS },

  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),

  updateOrderInList: (updated) =>
    set((s) => ({
      orders: s.orders.map((o) => (o._id === updated._id ? updated : o)),
      selectedOrder: s.selectedOrder?._id === updated._id ? updated : s.selectedOrder,
    })),

  setTrackingData: (data) => set({ trackingData: data }),
  setReturnStatus: (status) => set({ returnStatus: status }),
  setReturnError: (err) => set({ returnError: err }),

  setFilters: (partial) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...partial,
        page: partial.status !== undefined ? 1 : (partial.page ?? s.filters.page),
      },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  clearAll: () =>
    set({
      orders: [],
      selectedOrder: null,
      trackingData: null,
      returnStatus: 'idle',
      returnError: null,
      filters: { ...DEFAULT_FILTERS },
    }),
}))
