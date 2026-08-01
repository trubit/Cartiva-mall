import type { ReturnReason } from '../constants/index.js'

export type ReturnStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'awaiting_shipment'
  | 'in_transit'
  | 'received'
  | 'refunded'
  | 'completed'

export type ReturnType = 'return' | 'exchange' | 'refund_only'

export type DisputeType =
  | 'item_not_received'
  | 'item_not_as_described'
  | 'damaged'
  | 'refund_delayed'
  | 'other'

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed'
export type DisputeResolution = 'buyer_favor' | 'seller_favor' | 'partial'

export interface IReturnItem {
  productId: string
  sku: string
  title: string
  quantity: number
  reason: ReturnReason
}

export interface IReturn {
  _id: string
  orderId: { _id: string; orderNumber: string; grandTotal: number } | string
  userId: string | { _id: string; firstName: string; lastName: string; email: string }
  type: ReturnType
  items: IReturnItem[]
  reason: ReturnReason
  description?: string
  status: ReturnStatus
  refundAmount?: number
  evidence: { url: string; type: string; description?: string }[]
  adminNotes?: string
  sellerResponse?: string
  returnTrackingNumber?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface IDispute {
  _id: string
  orderId: string
  returnId?: string
  complainantId: { _id: string; firstName: string; lastName: string }
  respondentId: { _id: string; firstName: string; lastName: string }
  type: DisputeType
  description: string
  status: DisputeStatus
  resolution?: DisputeResolution
  resolutionNotes?: string
  evidence: { url: string; type: string; uploadedBy: string }[]
  messages: { senderId: string; role: string; content: string; createdAt: string }[]
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}
