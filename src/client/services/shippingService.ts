import api from './api.js'
import type { IShipment, ShipmentList, ShipmentStatus } from '../../shared/types/shipping.types.js'

export interface IShippingConfigData {
  rates?: Record<string, number>
  fixedRates?: Record<string, number> | Map<string, number>
  defaultCurrency: string
  defaultFee: number
  updatedAt: string
  auditLog?: Array<{
    adminEmail?: string
    previousRates: Record<string, number>
    newRates: Record<string, number>
    timestamp: string
    note?: string
  }>
}

export const shippingService = {
  trackByNumber: (trackingNumber: string) =>
    api.get<{ data: IShipment }>(`/shipments/track/${trackingNumber}`),

  getMyShipments: (page = 1, limit = 20) =>
    api.get<{ data: ShipmentList }>('/shipments/my', { params: { page, limit } }),

  getShipment: (id: string) => api.get<{ data: IShipment }>(`/shipments/${id}`),

  createShipment: (data: {
    orderId: string
    carrier: string
    shippingCost: number
    shippingAddress: IShipment['shippingAddress']
    weight?: number
    estimatedDelivery?: string
  }) => api.post<{ data: IShipment }>('/shipments', data),

  updateStatus: (id: string, status: ShipmentStatus, location?: string, description?: string) =>
    api.put<{ data: IShipment }>(`/shipments/${id}/status`, { status, location, description }),

  listAll: (page = 1, limit = 20, status?: ShipmentStatus) =>
    api.get<{ data: ShipmentList }>('/shipments', { params: { page, limit, status } }),

  getShippingConfig: () => api.get<{ data: IShippingConfigData }>('/shipments/config'),

  getAdminShippingConfig: () => api.get<{ data: IShippingConfigData }>('/shipments/admin/config'),

  updateAdminShippingConfig: (data: { rates: Record<string, number>; note?: string }) =>
    api.put<{ data: IShippingConfigData }>('/shipments/admin/config', data),
}
