import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sellerService } from '../services/sellerService.js'
import { useAuthStore } from '../store/authStore.js'

export function useSellerKycStatus() {
  return useQuery({
    queryKey: ['seller', 'kyc-status'],
    queryFn: async () => {
      const res = await sellerService.getKycStatus()
      const data = res.data
      if (data?.isVerified || data?.kycStatus === 'VERIFIED') {
        const currentUser = useAuthStore.getState().user
        if (currentUser && currentUser.role !== 'seller' && currentUser.role !== 'admin') {
          useAuthStore.getState().updateUser({ role: 'seller' })
        }
      }
      return data
    },
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.kycStatus
      return status === 'UNDER_REVIEW' || status === 'PENDING' ? 3000 : false
    },
    refetchIntervalInBackground: true,
  })
}

export function useSubmitSellerKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof sellerService.submitKyc>[0]) =>
      sellerService.submitKyc(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller', 'kyc-status'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'profile'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'dashboard'] })
    },
  })
}

export function useCreateSellerStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof sellerService.createStore>[0]) =>
      sellerService.createStore(data),
    onSuccess: () => {
      useAuthStore.getState().updateUser({ role: 'seller' })
      void qc.invalidateQueries({ queryKey: ['seller', 'kyc-status'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'profile'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'dashboard'] })
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useUploadStoreLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => sellerService.uploadStoreLogo(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller', 'kyc-status'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'profile'] })
      void qc.invalidateQueries({ queryKey: ['seller', 'dashboard'] })
    },
  })
}

export function useUploadKycDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => sellerService.uploadKycDocument(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller', 'kyc-status'] })
    },
  })
}
