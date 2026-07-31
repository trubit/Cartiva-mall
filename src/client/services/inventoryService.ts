import api from './api.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

export interface IWarehouse {
  _id: string
  name: string
  code: string
  address: { street: string; city: string; state: string; country: string; postalCode: string }
  capacity: number
  isActive: boolean
  createdAt: string
}

export interface IInventoryRecord {
  _id: string
  productId: string | { _id: string; title: string; sku: string; images: string[] }
  warehouseId: string | { _id: string; name: string; code: string }
  quantity: number
  reservedQuantity: number
  lowStockThreshold: number
}

export interface IInventoryMovement {
  _id: string
  productId: string | { _id: string; title: string; sku: string }
  warehouseId: string | { _id: string; name: string; code: string }
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation' | 'release'
  quantity: number
  note?: string
  referenceId?: string
  createdBy: string | { _id: string; firstName: string; lastName: string }
  createdAt: string
}

export interface IStockAlert {
  _id: string
  productId: string | { _id: string; title: string; sku: string; images: string[] }
  warehouseId: string | { _id: string; name: string; code: string }
  alertType: 'low_stock' | 'out_of_stock' | 'overstock'
  threshold: number
  currentQuantity: number
  isResolved: boolean
  createdAt: string
}

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const inventoryService = {
  // ── Warehouses ────────────────────────────────────────────────────────────────
  getWarehouses: async (activeOnly = false): Promise<IWarehouse[]> => {
    const res = await api.get<ApiResponse<IWarehouse[]>>(
      `/inventory/warehouses${activeOnly ? '?active=true' : ''}`,
    )
    return res.data.data ?? []
  },

  createWarehouse: async (data: Partial<IWarehouse>): Promise<IWarehouse> => {
    const res = await api.post<ApiResponse<IWarehouse>>('/inventory/warehouses', data)
    return res.data.data!
  },

  updateWarehouse: async (id: string, data: Partial<IWarehouse>): Promise<IWarehouse> => {
    const res = await api.put<ApiResponse<IWarehouse>>(`/inventory/warehouses/${id}`, data)
    return res.data.data!
  },

  deleteWarehouse: async (id: string): Promise<void> => {
    await api.delete(`/inventory/warehouses/${id}`)
  },

  // ── Inventory ─────────────────────────────────────────────────────────────────
  getProductInventory: async (productId: string): Promise<IInventoryRecord[]> => {
    const res = await api.get<ApiResponse<IInventoryRecord[]>>(`/inventory/product/${productId}`)
    return res.data.data ?? []
  },

  getWarehouseInventory: async (
    warehouseId: string,
    page = 1,
  ): Promise<PagedResult<IInventoryRecord>> => {
    const res = await api.get<ApiResponse<PagedResult<IInventoryRecord>>>(
      `/inventory/warehouse/${warehouseId}?page=${page}`,
    )
    return res.data.data!
  },

  setInventory: async (
    productId: string,
    warehouseId: string,
    quantity: number,
    lowStockThreshold = 10,
  ): Promise<IInventoryRecord> => {
    const res = await api.post<ApiResponse<IInventoryRecord>>('/inventory/set', {
      productId,
      warehouseId,
      quantity,
      lowStockThreshold,
    })
    return res.data.data!
  },

  stockIn: async (
    productId: string,
    warehouseId: string,
    quantity: number,
    note?: string,
  ): Promise<IInventoryRecord> => {
    const res = await api.post<ApiResponse<IInventoryRecord>>(
      `/inventory/product/${productId}/warehouse/${warehouseId}/in`,
      { quantity, note },
    )
    return res.data.data!
  },

  stockOut: async (
    productId: string,
    warehouseId: string,
    quantity: number,
    note?: string,
  ): Promise<IInventoryRecord> => {
    const res = await api.post<ApiResponse<IInventoryRecord>>(
      `/inventory/product/${productId}/warehouse/${warehouseId}/out`,
      { quantity, note },
    )
    return res.data.data!
  },

  // ── Movements ─────────────────────────────────────────────────────────────────
  getMovements: async (
    filter?: { productId?: string; warehouseId?: string },
    page = 1,
  ): Promise<PagedResult<IInventoryMovement>> => {
    const params = new URLSearchParams({ page: String(page) })
    if (filter?.productId) params.set('productId', filter.productId)
    if (filter?.warehouseId) params.set('warehouseId', filter.warehouseId)
    const res = await api.get<ApiResponse<PagedResult<IInventoryMovement>>>(
      `/inventory/movements?${params}`,
    )
    return res.data.data!
  },

  // ── Alerts ────────────────────────────────────────────────────────────────────
  getAlerts: async (page = 1): Promise<PagedResult<IStockAlert>> => {
    const res = await api.get<ApiResponse<PagedResult<IStockAlert>>>(
      `/inventory/alerts?page=${page}`,
    )
    return res.data.data!
  },

  resolveAlert: async (alertId: string): Promise<void> => {
    await api.patch(`/inventory/alerts/${alertId}/resolve`)
  },
}
