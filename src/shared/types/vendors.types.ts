export type VendorStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'blacklisted'
export type VendorVerificationStatus = 'unverified' | 'in_progress' | 'verified' | 'rejected'
export type BusinessType = 'individual' | 'business' | 'corporation'
export type DocumentType =
  | 'id_card'
  | 'passport'
  | 'drivers_license'
  | 'business_registration'
  | 'tax_certificate'
  | 'bank_statement'
  | 'proof_of_address'
  | 'other'
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type VerificationStepName = 'identity' | 'business' | 'banking' | 'address' | 'final'
export type VerificationStepStatus = 'pending' | 'submitted' | 'approved' | 'rejected'
export type VerificationOverallStatus = 'unverified' | 'in_progress' | 'verified' | 'rejected'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'check'
export type AuditAction =
  | 'registered'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'reactivated'
  | 'blacklisted'
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'storefront_created'
  | 'storefront_updated'
  | 'subscription_changed'
  | 'payout_requested'
  | 'payout_completed'
  | 'profile_updated'
  | 'verification_submitted'
  | 'onboarding_step_completed'

export interface IVendor {
  _id: string
  userId: string | { _id: string; firstName: string; lastName: string; email: string }
  businessName: string
  businessType: BusinessType
  status: VendorStatus
  verificationStatus: VendorVerificationStatus
  isApproved: boolean
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
  blacklistReason?: string
  suspensionReason?: string
  onboardingStep: number
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface IVendorProfile {
  _id: string
  vendorId: string
  displayName: string
  bio?: string
  website?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  socialLinks?: {
    twitter?: string
    instagram?: string
    facebook?: string
    linkedin?: string
  }
  createdAt: string
  updatedAt: string
}

export interface IVendorStorefront {
  _id: string
  vendorId: string
  name: string
  slug: string
  description?: string
  logo?: string
  banner?: string
  policies?: { returns?: string; shipping?: string; payment?: string }
  theme?: { primaryColor?: string; secondaryColor?: string }
  isPublic: boolean
  totalProducts: number
  totalSales: number
  createdAt: string
  updatedAt: string
}

export interface IVendorDocument {
  _id: string
  vendorId: string
  type: DocumentType
  fileUrl: string
  fileName: string
  fileSize?: number
  mimeType?: string
  status: DocumentStatus
  reviewedAt?: string
  reviewedBy?: string
  rejectionReason?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface IVerificationStep {
  step: VerificationStepName
  status: VerificationStepStatus
  submittedAt?: string
  reviewedAt?: string
  notes?: string
}

export interface IVendorVerification {
  _id: string
  vendorId: string
  steps: IVerificationStep[]
  overallStatus: VerificationOverallStatus
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface IVendorPayout {
  _id: string
  vendorId: string
  amount: number
  currency: string
  status: PayoutStatus
  method: PayoutMethod
  periodStart: string
  periodEnd: string
  commissionsIncluded: string[]
  transactionId?: string
  failureReason?: string
  processedAt?: string
  processedBy?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface IVendorScore {
  _id: string
  vendorId: string
  overallScore: number
  fulfillmentRate: number
  returnRate: number
  avgResponseHours: number
  productQualityScore: number
  customerSatisfactionScore: number
  totalOrders: number
  period: string
  createdAt: string
  updatedAt: string
}

export interface IVendorAudit {
  _id: string
  vendorId: string
  action: AuditAction
  performedBy: string | { _id: string; firstName: string; lastName: string; role: string }
  metadata?: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

export interface IVendorDetail {
  vendor: IVendor
  profile: IVendorProfile | null
  storefront: IVendorStorefront | null
  verification: IVendorVerification | null
  latestScore: IVendorScore | null
}

export interface IVendorAnalytics {
  summary: { totalRevenue: number; totalEarnings: number; totalOrders: number }
  recentCommissions: unknown[]
  score: IVendorScore | null
  approvedDocuments: number
  sellerId: string
}
