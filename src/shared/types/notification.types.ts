export type NotificationType =
  | 'order'
  | 'system'
  | 'promotion'
  | 'wishlist'
  | 'security'
  | 'message'
  | 'payment'
  | 'shipping'
  | 'inventory'

export interface INotification {
  _id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link?: string
  data?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface NotificationList {
  items: INotification[]
  total: number
  unread: number
  page: number
  pages: number
}
