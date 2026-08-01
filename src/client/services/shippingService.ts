import api from './api'
import type { IShipment, ShipmentList, ShipmentStatus } from '../../shared/types/shipping.types.js'

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
}
