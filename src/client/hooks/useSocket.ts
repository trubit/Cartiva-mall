import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService.js'
import { useAuthStore } from '../store/authStore.js'
import { useDashboardStore } from '../store/dashboardStore.js'
import { NOTIF_KEY } from './useDashboard.js'
import { ORDER_KEY } from './useOrders.js'

/**
 * Call once (inside DashboardLayout or a top-level auth guard) when a user
 * is authenticated. Connects the socket, joins the user-specific room via JWT
 * (never sends userId directly — the server verifies the token and extracts
 * the userId to join the correct room), and wires up real-time events to
 * invalidate the appropriate React Query caches.
 *
 * userId is the trigger — when it becomes available after login or page reload,
 * the hook fires. The access token is read from Zustand internally; if it's
 * null (e.g., page reload before token refresh completes) the socket waits.
 */
export const useSocket = (userId: string | undefined) => {
  const qc = useQueryClient()
  const incrementUnread = useDashboardStore((s) => s.incrementUnreadCount)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!userId || !accessToken) return

    connectSocket(accessToken)
    const socket = getSocket()

    const onNewNotification = () => {
      incrementUnread()
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    const onOrderUpdated = () => {
      qc.invalidateQueries({ queryKey: ORDER_KEY })
    }

    const onShipmentUpdated = () => {
      qc.invalidateQueries({ queryKey: ORDER_KEY })
    }

    socket.on('notification:new', onNewNotification)
    socket.on('order:updated', onOrderUpdated)
    socket.on('shipment:updated', onShipmentUpdated)

    return () => {
      socket.off('notification:new', onNewNotification)
      socket.off('order:updated', onOrderUpdated)
      socket.off('shipment:updated', onShipmentUpdated)
      disconnectSocket()
    }
  }, [userId, accessToken, qc, incrementUnread])
}
