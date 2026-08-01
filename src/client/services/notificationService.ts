import api from './api'
import type { INotification, NotificationList } from '../../shared/types/notification.types.js'

export const notificationService = {
  list: (page = 1, limit = 20) =>
    api.get<{ data: NotificationList }>('/notifications', { params: { page, limit } }),

  getUnreadCount: () => api.get<{ data: { count: number } }>('/notifications/unread'),

  markRead: (id: string) => api.put<{ data: INotification }>(`/notifications/${id}/read`),

  markAllRead: () => api.put('/notifications/read-all'),

  delete: (id: string) => api.delete(`/notifications/${id}`),
}
