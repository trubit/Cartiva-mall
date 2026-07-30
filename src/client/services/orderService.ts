import api from './api.js'
import type {
  IOrder,
  IOrderTracking,
  ICreateOrderResponse,
  PaginationMeta,
} from '../../shared/types/index.js'

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data
const unwrapPage = <T>(res: { data: { data: T; pagination?: PaginationMeta } }) => ({
  orders: res.data.data,
  pagination: res.data.pagination,
})

export type PagedOrders = { orders: IOrder[]; pagination?: PaginationMeta }

export const orderService = {
  // ── Core CRUD ──────────────────────────────────────────────────────────────
  createOrder(checkoutSessionId: string, notes?: string): Promise<ICreateOrderResponse> {
    return api.post('/orders', { checkoutSessionId, notes }).then(unwrap<ICreateOrderResponse>)
  },

  getMyOrders(params?: { status?: string; page?: number; limit?: number }): Promise<PagedOrders> {
    return api.get('/orders', { params }).then(unwrapPage<IOrder[]>)
  },

  getOrder(orderId: string): Promise<IOrder> {
    return api.get(`/orders/${orderId}`).then(unwrap<IOrder>)
  },

  // ── Tracking ────────────────────────────────────────────────────────────────
  trackOrder(orderId: string): Promise<{
    orderNumber: string
    orderStatus: string
    shippingMethod: string
    tracking: IOrderTracking
    createdAt: string
    updatedAt: string
  }> {
    return api.get(`/orders/${orderId}/track`).then(
      unwrap<{
        orderNumber: string
        orderStatus: string
        shippingMethod: string
        tracking: IOrderTracking
        createdAt: string
        updatedAt: string
      }>,
    )
  },

  // ── Cancel ──────────────────────────────────────────────────────────────────
  cancelOrder(orderId: string, reason?: string): Promise<IOrder> {
    return api.put(`/orders/${orderId}/cancel`, { reason }).then(unwrap<IOrder>)
  },

  // ── Status update (seller / admin) ─────────────────────────────────────────
  updateOrderStatus(
    orderId: string,
    orderStatus: string,
    tracking?: {
      trackingNumber?: string
      carrier?: string
      trackingUrl?: string
      estimatedDeliveryDate?: string
      location?: string
      note?: string
    },
  ): Promise<IOrder> {
    return api.put(`/orders/${orderId}/status`, { orderStatus, tracking }).then(unwrap<IOrder>)
  },

  // ── Return request ──────────────────────────────────────────────────────────
  requestReturn(orderId: string, reason: string, description?: string): Promise<IOrder> {
    return api.post(`/orders/${orderId}/return`, { reason, description }).then(unwrap<IOrder>)
  },

  updateReturnStatus(
    orderId: string,
    status: 'approved' | 'rejected' | 'completed',
    refundAmount?: number,
    note?: string,
  ): Promise<IOrder> {
    return api
      .put(`/orders/${orderId}/return/status`, { status, refundAmount, note })
      .then(unwrap<IOrder>)
  },

  // ── Seller orders ────────────────────────────────────────────────────────────
  getSellerOrders(params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<PagedOrders> {
    return api.get('/orders/seller', { params }).then(unwrapPage<IOrder[]>)
  },
}
