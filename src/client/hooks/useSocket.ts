import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService.js'
import { useAuthStore } from '../store/authStore.js'
import { useDashboardStore } from '../store/dashboardStore.js'
import { NOTIF_KEY } from './useDashboard.js'
import { ORDER_KEY, SELLER_ORDER_KEY } from './useOrders.js'
import { CONVERSATIONS_KEY, UNREAD_MESSAGES_KEY } from './useMessaging.js'

export const useSocket = (userId: string | undefined) => {
  const qc = useQueryClient()
  const incrementUnread = useDashboardStore((s) => s.incrementUnreadCount)
  const setUnreadCount = useDashboardStore((s) => s.setUnreadCount)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!userId || !accessToken) return

    connectSocket(accessToken)
    const socket = getSocket()

    const onNewNotification = () => {
      incrementUnread()
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    const onUnreadCount = (data: { unreadCount?: number }) => {
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount)
      }
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    const onOrderEvent = () => {
      qc.invalidateQueries({ queryKey: ORDER_KEY })
      qc.invalidateQueries({ queryKey: SELLER_ORDER_KEY })
      qc.invalidateQueries({ queryKey: ['seller', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    const onMessageEvent = () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_MESSAGES_KEY })
    }

    const onKycUpdated = (payload: { kycStatus?: string; isVerified?: boolean; role?: string }) => {
      if (payload?.isVerified || payload?.kycStatus === 'VERIFIED' || payload?.role === 'seller') {
        useAuthStore.getState().updateUser({ role: 'seller' })
      }
      qc.invalidateQueries({ queryKey: ['seller'] })
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    const onStoreCreated = () => {
      useAuthStore.getState().updateUser({ role: 'seller' })
      qc.invalidateQueries({ queryKey: ['seller'] })
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      qc.invalidateQueries({ queryKey: NOTIF_KEY })
    }

    socket.on('notification:new', onNewNotification)
    socket.on('notification:unread_count', onUnreadCount)
    socket.on('order:new', onOrderEvent)
    socket.on('order:updated', onOrderEvent)
    socket.on('order:status_changed', onOrderEvent)
    socket.on('shipment:updated', onOrderEvent)
    socket.on('message:new', onMessageEvent)
    socket.on('conversation:updated', onMessageEvent)
    socket.on('seller:kyc:updated', onKycUpdated)
    socket.on('seller:store:created', onStoreCreated)

    return () => {
      socket.off('notification:new', onNewNotification)
      socket.off('notification:unread_count', onUnreadCount)
      socket.off('order:new', onOrderEvent)
      socket.off('order:updated', onOrderEvent)
      socket.off('order:status_changed', onOrderEvent)
      socket.off('shipment:updated', onOrderEvent)
      socket.off('message:new', onMessageEvent)
      socket.off('conversation:updated', onMessageEvent)
      socket.off('seller:kyc:updated', onKycUpdated)
      socket.off('seller:store:created', onStoreCreated)
      disconnectSocket()
    }
  }, [userId, accessToken, qc, incrementUnread, setUnreadCount])
}
