import api from './api'
import type {
  IVendorDetail,
  IVendorAnalytics,
  IVendorDocument,
  IVendorPayout,
  IVendorScore,
  IVendorAudit,
  VendorStatus,
  VerificationStepName,
  DocumentType,
  PayoutMethod,
} from '../../shared/types/vendors.types.js'

interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

export const vendorsService = {
  // ─── Registration & Profile ───────────────────────────────────────────────

  async register(data: { businessName: string; businessType: string; displayName: string }) {
    const res = await api.post('/vendors/register', data)
    return res.data.data as IVendorDetail['vendor']
  },

  async getMyVendor() {
    const res = await api.get('/vendors/me')
    return res.data.data as IVendorDetail
  },

  async getVendorById(vendorId: string) {
    const res = await api.get(`/vendors/${vendorId}`)
    return res.data.data as IVendorDetail
  },

  async updateProfile(
    vendorId: string,
    data: {
      businessName?: string
      bio?: string
      website?: string
      phone?: string
      address?: Record<string, string>
      socialLinks?: Record<string, string>
      taxId?: string
    },
  ) {
    const res = await api.put(`/vendors/${vendorId}/profile`, data)
    return res.data.data
  },

  // ─── Verification ─────────────────────────────────────────────────────────

  async submitVerification(vendorId: string, step: VerificationStepName) {
    const res = await api.post(`/vendors/${vendorId}/verify`, { step })
    return res.data.data
  },

  // ─── Storefront ───────────────────────────────────────────────────────────

  async upsertStorefront(
    vendorId: string,
    data: {
      name: string
      slug: string
      description?: string
      logo?: string
      banner?: string
      policies?: Record<string, string>
      theme?: Record<string, string>
    },
  ) {
    const res = await api.post(`/vendors/${vendorId}/storefront`, data)
    return res.data.data
  },

  async getStorefrontBySlug(slug: string) {
    const res = await api.get(`/vendors/storefront/${slug}`)
    return res.data.data
  },

  // ─── Documents ────────────────────────────────────────────────────────────

  async uploadDocument(
    vendorId: string,
    data: {
      type: DocumentType
      fileUrl: string
      fileName: string
      fileSize?: number
      mimeType?: string
      expiresAt?: string
    },
  ) {
    const res = await api.post(`/vendors/${vendorId}/documents`, data)
    return res.data.data as IVendorDocument
  },

  async listDocuments(vendorId: string) {
    const res = await api.get(`/vendors/${vendorId}/documents`)
    return res.data.data as IVendorDocument[]
  },

  // ─── Analytics & Score ────────────────────────────────────────────────────

  async getAnalytics(vendorId: string) {
    const res = await api.get(`/vendors/${vendorId}/analytics`)
    return res.data.data as IVendorAnalytics
  },

  async getScore(vendorId: string) {
    const res = await api.get(`/vendors/${vendorId}/score`)
    return res.data.data as IVendorScore | null
  },

  // ─── Payouts ──────────────────────────────────────────────────────────────

  async requestPayout(
    vendorId: string,
    data: { method: PayoutMethod; periodStart: string; periodEnd: string },
  ) {
    const res = await api.post(`/vendors/${vendorId}/payouts`, data)
    return res.data.data as IVendorPayout
  },

  async listPayouts(vendorId: string, page = 1) {
    const res = await api.get(`/vendors/${vendorId}/payouts`, { params: { page } })
    return res.data.data as PaginatedResult<IVendorPayout>
  },

  // ─── Audit Log ────────────────────────────────────────────────────────────

  async getAuditLog(vendorId: string, page = 1) {
    const res = await api.get(`/vendors/${vendorId}/audit`, { params: { page } })
    return res.data.data as PaginatedResult<IVendorAudit>
  },

  // ─── Admin ────────────────────────────────────────────────────────────────

  async listAllVendors(page = 1, filters?: { status?: string; verificationStatus?: string }) {
    const res = await api.get('/vendors/admin/all', { params: { page, ...filters } })
    return res.data.data as PaginatedResult<IVendorDetail['vendor']>
  },

  async getPendingApprovals(page = 1) {
    const res = await api.get('/vendors/admin/pending', { params: { page } })
    return res.data.data as PaginatedResult<IVendorDetail['vendor']>
  },

  async approveVendor(vendorId: string) {
    const res = await api.put(`/vendors/${vendorId}/approve`)
    return res.data.data
  },

  async rejectVendor(vendorId: string, reason: string) {
    const res = await api.put(`/vendors/${vendorId}/reject`, { reason })
    return res.data.data
  },

  async suspendVendor(vendorId: string, reason: string) {
    const res = await api.put(`/vendors/${vendorId}/suspend`, { reason })
    return res.data.data
  },

  async reactivateVendor(vendorId: string) {
    const res = await api.put(`/vendors/${vendorId}/reactivate`)
    return res.data.data
  },

  async blacklistVendor(vendorId: string, reason: string) {
    const res = await api.put(`/vendors/${vendorId}/blacklist`, { reason })
    return res.data.data
  },

  async reviewDocument(
    documentId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
  ) {
    const res = await api.put(`/vendors/documents/${documentId}/review`, {
      status,
      rejectionReason,
    })
    return res.data.data as IVendorDocument
  },

  async processPayout(payoutId: string, transactionId: string) {
    const res = await api.put(`/vendors/payouts/${payoutId}/process`, { transactionId })
    return res.data.data as IVendorPayout
  },

  // Keep for type compatibility
  filterStatus(_status: VendorStatus) {
    return _status
  },
}
