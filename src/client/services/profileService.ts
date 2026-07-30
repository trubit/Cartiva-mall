import api from './api.js'
import type {
  IUser,
  ProfileUpdatePayload,
  AddressPayload,
  NotificationPayload,
} from '../../shared/types/user.types.js'

interface ProfileResponse {
  success: boolean
  message: string
  data?: { user: IUser }
}

const toUser = (res: ProfileResponse): IUser => {
  if (!res.data?.user) throw new Error(res.message ?? 'Profile error')
  return res.data.user
}

export const profileService = {
  getMe: async (): Promise<IUser> => {
    const { data } = await api.get<ProfileResponse>('/profile/me')
    return toUser(data)
  },

  updateProfile: async (payload: ProfileUpdatePayload): Promise<IUser> => {
    const { data } = await api.put<ProfileResponse>('/profile/update', payload)
    return toUser(data)
  },

  updateAddress: async (payload: AddressPayload): Promise<IUser> => {
    const { data } = await api.put<ProfileResponse>('/profile/address', payload)
    return toUser(data)
  },

  uploadAvatar: async (file: File): Promise<IUser> => {
    const form = new FormData()
    form.append('avatar', file)
    const { data } = await api.put<ProfileResponse>('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return toUser(data)
  },

  updateNotifications: async (payload: NotificationPayload): Promise<IUser> => {
    const { data } = await api.put<ProfileResponse>('/profile/notifications', payload)
    return toUser(data)
  },

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete('/profile/delete-account', { data: { password } })
  },
}
