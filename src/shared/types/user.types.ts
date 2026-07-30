import type { UserRole } from './auth.types.js'

export interface IAddress {
  country: string
  state: string
  city: string
  street: string
  postalCode: string
}

export interface INotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  orderUpdates: boolean
  promotions: boolean
  newsletter: boolean
}

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface IUser {
  _id: string
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber?: string
  bio?: string
  gender?: Gender
  dateOfBirth?: string
  profileImage: string
  address: IAddress
  language: string
  preferences: Record<string, unknown>
  notificationSettings: INotificationSettings
  role: UserRole
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface IPublicUser {
  _id: string
  firstName: string
  lastName: string
  username: string
  avatar?: string
  role: UserRole
}

export type ProfileUpdatePayload = Partial<
  Pick<
    IUser,
    | 'firstName'
    | 'lastName'
    | 'username'
    | 'phoneNumber'
    | 'bio'
    | 'gender'
    | 'dateOfBirth'
    | 'language'
  >
>

export type AddressPayload = Partial<IAddress>
export type NotificationPayload = Partial<INotificationSettings>
