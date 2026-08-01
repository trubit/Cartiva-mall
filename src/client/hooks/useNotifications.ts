import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notificationService'

export const useNotifications = (page = 1) => {
  const qc = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationService.list(page),
    select: (res) => res.data.data,
  })

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationService.getUnreadCount(),
    select: (res) => res.data.data.count,
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteNotification = useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return { listQuery, unreadQuery, markRead, markAllRead, deleteNotification }
}
