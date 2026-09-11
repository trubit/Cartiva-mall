import api from '../../../client/services/api.js'
import type { IOrder, IOrderHistoryEntry } from '../types/order.types.js'

export async function fetchMyOrders(params?: { status?: string; page?: number; limit?: number }) {
  const response = await api.get('/orders', { params })
  return response.data
}

export async function fetchOrderById(id: string) {
  const response = await api.get(`/orders/${id}`)
  return response.data.data as IOrder
}

export async function fetchOrderByNumber(orderNumber: string) {
  const response = await api.get(`/orders/number/${orderNumber}`)
  return response.data.data as IOrder
}

export async function fetchOrderHistory(id: string) {
  const response = await api.get(`/orders/${id}/history`)
  return response.data.data as IOrderHistoryEntry[]
}

export async function cancelOrder(id: string, reason?: string) {
  const response = await api.post(`/orders/${id}/cancel`, { reason })
  return response.data.data as IOrder
}

export async function fetchSellerOrders(params?: {
  status?: string
  page?: number
  limit?: number
}) {
  const response = await api.get('/orders/seller', { params })
  return response.data
}

export async function fetchAdminOrders(params?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const response = await api.get('/orders/admin', { params })
  return response.data
}
