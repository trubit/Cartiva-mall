import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingService } from '../services/messagingService'
import { useMessagingStore } from '../store/messagingStore'
import { useAuthStore } from '../store/authStore.js'
import { getSocket } from '../services/socketService'
import type { IMessage } from '../../shared/types/messaging.types.js'

export const CONVERSATIONS_KEY = ['conversations'] as const
export const UNREAD_MESSAGES_KEY = ['unread-messages-count'] as const

export const useConversations = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: async () => {
      const res = await messagingService.listConversations()
      const data = res.data?.data ?? { items: [], total: 0, unreadTotal: 0 }
      useMessagingStore.getState().setConversations(data.items ?? [])
      return data
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

export const useUnreadMessagesCount = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: UNREAD_MESSAGES_KEY,
    queryFn: async () => {
      const res = await messagingService.getUnreadCount()
      const counts = res.data?.data ?? { unreadConversations: 0 }
      useMessagingStore.getState().setUnreadTotal(counts.unreadConversations)
      return counts
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: isAuthenticated ? 60_000 : false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

export const useStartConversation = () => {
  const qc = useQueryClient()
  const addConversation = useMessagingStore((s) => s.addConversation)

  return useMutation({
    mutationFn: (data: {
      recipientId: string
      productId?: string
      orderId?: string
      subject?: string
    }) => messagingService.startConversation(data.recipientId, data),
    onSuccess: (res) => {
      if (res.data?.data) {
        addConversation(res.data.data)
      }
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_MESSAGES_KEY })
    },
  })
}

export const useMessages = (conversationId: string) => {
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addMessage = useMessagingStore((s) => s.addMessage)
  const updateMessage = useMessagingStore((s) => s.updateMessage)
  const setTyping = useMessagingStore((s) => s.setTyping)

  useEffect(() => {
    if (!conversationId || !isAuthenticated) return
    const s = getSocket()
    useMessagingStore.getState().setActiveConversation(conversationId)
    s.emit('join:conversation', conversationId)

    const onNew = (payload: any) => {
      const msg: IMessage = payload?.message ?? payload
      if (String(msg?.conversationId) === String(conversationId)) {
        addMessage(msg)
        qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
        qc.invalidateQueries({ queryKey: UNREAD_MESSAGES_KEY })
      }
    }
    const onEdit = (payload: any) => {
      const msg: IMessage = payload?.message ?? payload
      if (String(msg?.conversationId) === String(conversationId)) {
        updateMessage(msg)
      }
    }
    const onDelete = (payload: any) => {
      const msg: IMessage = payload?.message ?? payload
      if (String(msg?.conversationId) === String(conversationId)) {
        updateMessage(msg)
      }
    }
    const onTypingStart = ({ userId }: { userId: string }) =>
      setTyping(conversationId, userId, true)
    const onTypingStop = ({ userId }: { userId: string }) =>
      setTyping(conversationId, userId, false)

    s.on('message:new', onNew)
    s.on('message:edited', onEdit)
    s.on('message:deleted', onDelete)
    s.on('typing:start', onTypingStart)
    s.on('typing:stop', onTypingStop)

    return () => {
      s.emit('leave:conversation', conversationId)
      useMessagingStore.getState().setActiveConversation(null)
      s.off('message:new', onNew)
      s.off('message:edited', onEdit)
      s.off('message:deleted', onDelete)
      s.off('typing:start', onTypingStart)
      s.off('typing:stop', onTypingStop)
    }
  }, [conversationId, isAuthenticated, addMessage, updateMessage, setTyping, qc])

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await messagingService.getMessages(conversationId)
      const items = res.data?.data?.items ?? []
      useMessagingStore.getState().setMessages(conversationId, items)
      return res.data?.data ?? { items: [], total: 0 }
    },
    enabled: !!conversationId && isAuthenticated,
    staleTime: 10_000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

export const useSendMessage = () => {
  const qc = useQueryClient()
  const addMessage = useMessagingStore((s) => s.addMessage)

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      messagingService.sendMessage(conversationId, content),
    onSuccess: (res) => {
      if (res.data?.data) {
        addMessage(res.data.data)
      }
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_MESSAGES_KEY })
    },
  })
}

export const useTypingIndicator = (conversationId: string) => {
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTyping = useRef(false)

  const onType = useCallback(() => {
    if (!conversationId) return
    const s = getSocket()
    if (!isTyping.current) {
      isTyping.current = true
      s.emit('typing:start', conversationId)
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      isTyping.current = false
      s.emit('typing:stop', conversationId)
    }, 2000)
  }, [conversationId])

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [])

  return { onType }
}
