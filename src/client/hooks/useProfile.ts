import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService } from '../services/profileService.js'
import { useAuthStore } from '../store/authStore.js'
import type {
  ProfileUpdatePayload,
  AddressPayload,
  NotificationPayload,
} from '../../shared/types/user.types.js'

const PROFILE_KEY = ['profile', 'me'] as const

export const useProfile = () =>
  useQuery({
    queryKey: PROFILE_KEY,
    queryFn: profileService.getMe,
    staleTime: 5 * 60 * 1000,
  })

export const useUpdateProfile = () => {
  const qc = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileService.updateProfile(payload),
    onSuccess: (user) => {
      qc.setQueryData(PROFILE_KEY, user)
      updateUser(user)
    },
  })
}

export const useUpdateAddress = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddressPayload) => profileService.updateAddress(payload),
    onSuccess: (user) => qc.setQueryData(PROFILE_KEY, user),
  })
}

export const useUploadAvatar = () => {
  const qc = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (user) => {
      qc.setQueryData(PROFILE_KEY, user)
      updateUser({ profileImage: user.profileImage })
    },
  })
}

export const useUpdateNotifications = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificationPayload) => profileService.updateNotifications(payload),
    onSuccess: (user) => qc.setQueryData(PROFILE_KEY, user),
  })
}

export const useDeleteAccount = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  return useMutation({
    mutationFn: (password: string) => profileService.deleteAccount(password),
    onSuccess: () => clearAuth(),
  })
}
