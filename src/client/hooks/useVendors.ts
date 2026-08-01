import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorsService } from '../services/vendorsService.js'
import type {
  VerificationStepName,
  DocumentType,
  PayoutMethod,
} from '../../shared/types/vendors.types.js'

// ─── Vendor Profile ───────────────────────────────────────────────────────────

export function useMyVendorDetail() {
  return useQuery({
    queryKey: ['vendors', 'me'],
    queryFn: () => vendorsService.getMyVendor(),
    retry: false,
  })
}

export function useVendorById(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId],
    queryFn: () => vendorsService.getVendorById(vendorId),
    enabled: !!vendorId,
  })
}

export function useRegisterVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof vendorsService.register>[0]) =>
      vendorsService.register(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', 'me'] })
    },
  })
}

export function useUpdateVendorProfile(vendorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof vendorsService.updateProfile>[1]) =>
      vendorsService.updateProfile(vendorId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', 'me'] })
      void qc.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
  })
}

// ─── Verification ─────────────────────────────────────────────────────────────

export function useSubmitVerification(vendorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (step: VerificationStepName) => vendorsService.submitVerification(vendorId, step),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', 'me'] })
      void qc.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
  })
}

// ─── Storefront ───────────────────────────────────────────────────────────────

export function useUpsertStorefront(vendorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof vendorsService.upsertStorefront>[1]) =>
      vendorsService.upsertStorefront(vendorId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
  })
}

export function useStorefrontBySlug(slug: string) {
  return useQuery({
    queryKey: ['storefronts', slug],
    queryFn: () => vendorsService.getStorefrontBySlug(slug),
    enabled: !!slug,
  })
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useVendorDocuments(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'documents'],
    queryFn: () => vendorsService.listDocuments(vendorId),
    enabled: !!vendorId,
  })
}

export function useUploadDocument(vendorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type: DocumentType
      fileUrl: string
      fileName: string
      fileSize?: number
      mimeType?: string
      expiresAt?: string
    }) => vendorsService.uploadDocument(vendorId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', vendorId, 'documents'] })
    },
  })
}

// ─── Analytics & Score ────────────────────────────────────────────────────────

export function useVendorAnalytics(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'analytics'],
    queryFn: () => vendorsService.getAnalytics(vendorId),
    enabled: !!vendorId,
  })
}

export function useVendorScore(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'score'],
    queryFn: () => vendorsService.getScore(vendorId),
    enabled: !!vendorId,
  })
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

export function useVendorPayouts(vendorId: string, page = 1) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'payouts', page],
    queryFn: () => vendorsService.listPayouts(vendorId, page),
    enabled: !!vendorId,
  })
}

export function useRequestPayout(vendorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { method: PayoutMethod; periodStart: string; periodEnd: string }) =>
      vendorsService.requestPayout(vendorId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', vendorId, 'payouts'] })
    },
  })
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export function useVendorAuditLog(vendorId: string, page = 1) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'audit', page],
    queryFn: () => vendorsService.getAuditLog(vendorId, page),
    enabled: !!vendorId,
  })
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function useAllVendors(
  page = 1,
  filters?: { status?: string; verificationStatus?: string },
) {
  return useQuery({
    queryKey: ['vendors', 'admin', 'all', page, filters],
    queryFn: () => vendorsService.listAllVendors(page, filters),
  })
}

export function usePendingApprovals(page = 1) {
  return useQuery({
    queryKey: ['vendors', 'admin', 'pending', page],
    queryFn: () => vendorsService.getPendingApprovals(page),
  })
}

export function useApproveVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => vendorsService.approveVendor(vendorId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', 'admin'] })
    },
  })
}

export function useRejectVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) =>
      vendorsService.rejectVendor(vendorId, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', 'admin'] })
    },
  })
}

export function useSuspendVendorFull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) =>
      vendorsService.suspendVendor(vendorId, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useReactivateVendorFull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => vendorsService.reactivateVendor(vendorId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useBlacklistVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) =>
      vendorsService.blacklistVendor(vendorId, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useReviewDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      documentId,
      status,
      rejectionReason,
    }: {
      documentId: string
      status: 'approved' | 'rejected'
      rejectionReason?: string
    }) => vendorsService.reviewDocument(documentId, status, rejectionReason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useProcessPayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payoutId, transactionId }: { payoutId: string; transactionId: string }) =>
      vendorsService.processPayout(payoutId, transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}
