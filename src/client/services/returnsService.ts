import api from './api'
import type {
  IReturn,
  IDispute,
  ReturnStatus,
  ReturnType,
  DisputeType,
} from '../../shared/types/returns.types.js'

interface ReturnList {
  items: IReturn[]
  total: number
  page: number
  pages: number
}

interface DisputeList {
  items: IDispute[]
  total: number
  page: number
  pages: number
}

export const returnsService = {
  submitReturn: (data: {
    orderId: string
    type: ReturnType
    items: { productId: string; sku: string; title: string; quantity: number; reason: string }[]
    reason: string
    description?: string
  }) => api.post<{ data: IReturn }>('/returns', data),

  listReturns: (page = 1, limit = 20) =>
    api.get<{ data: ReturnList }>('/returns', { params: { page, limit } }),

  getReturn: (id: string) => api.get<{ data: IReturn }>(`/returns/${id}`),

  updateStatus: (id: string, status: ReturnStatus, adminNotes?: string, refundAmount?: number) =>
    api.put<{ data: IReturn }>(`/returns/${id}/status`, { status, adminNotes, refundAmount }),

  openDispute: (data: {
    orderId: string
    returnId?: string
    type: DisputeType
    description: string
  }) => api.post<{ data: IDispute }>('/returns/disputes', data),

  listDisputes: (page = 1, limit = 20) =>
    api.get<{ data: DisputeList }>('/returns/disputes', { params: { page, limit } }),

  addDisputeMessage: (id: string, content: string) =>
    api.post<{ data: IDispute }>(`/returns/disputes/${id}/messages`, { content }),

  resolveDispute: (
    id: string,
    resolution: 'buyer_favor' | 'seller_favor' | 'partial',
    resolutionNotes?: string,
  ) =>
    api.put<{ data: IDispute }>(`/returns/disputes/${id}/resolve`, { resolution, resolutionNotes }),
}
