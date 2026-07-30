import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService.js'
import { useDashboardStore } from '../store/dashboardStore.js'
import { NOTIF_KEY } from './useDashboard.js'
import { ORDER_KEY } from './useOrders.js'

/**
 * Call once (inside DashboardLayout or a top-level auth guard) when a user
 * is authenticated. Connects the socket, joins the user-specific room, and
 * wires up real-time events to invalidate the appropriate React Query caches.
 */
export const useSocket = (userId: string | undefined) => {
  const qc = useQueryClient()
  const incrementUnread = useDashboardStore((s) => s.incrementUnreadCount)

  useEffect(() => {
    if (!userId) return

    connectSocket(userId)
    const socket = getSocket()

    const onNewNotification = () => {
      incrementUnread()
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    const onOrderUpdated = () => {
      qc.invalidateQueries({ queryKey: ORDER_KEY })
    }

    socket.on('notification:new', onNewNotification)
    socket.on('order:updated', onOrderUpdated)

    return () => {
      socket.off('notification:new', onNewNotification)
      socket.off('order:updated', onOrderUpdated)
      disconnectSocket()
    }
  }, [userId, qc, incrementUnread])
}
