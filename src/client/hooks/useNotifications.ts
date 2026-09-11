import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notificationService.js'
import { useAuthStore } from '../store/authStore.js'

export const useNotifications = (page = 1, options?: { enabled?: boolean }) => {
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const listQuery = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationService.list(page),
    select: (res) => res.data.data,
    staleTime: 60_000, // 60 s — treat cached data as fresh for 1 minute
    gcTime: 5 * 60_000, // 5 min cache retention
    enabled: isAuthenticated && (options?.enabled ?? true),
    refetchOnWindowFocus: false, // never refetch just because the window gets focus
    refetchOnMount: false, // rely on enabled flag, not mount events
    refetchOnReconnect: false, // network reconnect does not blast the server
    retry: false, // 429s must not be retried
  })

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationService.getUnreadCount(),
    select: (res) =>
      typeof res.data.data === 'number'
        ? res.data.data
        : ((res.data.data as unknown as Record<string, number>)?.count ??
          (res.data.data as unknown as Record<string, number>)?.unreadCount ??
          0),
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 120_000 : false, // poll every 2 minutes for logged in users
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
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
