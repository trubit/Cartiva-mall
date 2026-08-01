import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { messagingService } from '../services/messagingService'
import { useMessagingStore } from '../store/messagingStore'
import { getSocket } from '../services/socketService'
import type { IMessage } from '../../shared/types/messaging.types.js'

export const useConversations = () => {
  const setConversations = useMessagingStore((s) => s.setConversations)

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await messagingService.listConversations()
      setConversations(res.data.data.items)
      return res.data.data
    },
  })
}

export const useMessages = (conversationId: string) => {
  const setMessages = useMessagingStore((s) => s.setMessages)
  const addMessage = useMessagingStore((s) => s.addMessage)
  const updateMessage = useMessagingStore((s) => s.updateMessage)
  const setTyping = useMessagingStore((s) => s.setTyping)
  const setActiveConversation = useMessagingStore((s) => s.setActiveConversation)

  useEffect(() => {
    if (!conversationId) return
    const s = getSocket()
    setActiveConversation(conversationId)
    s.emit('join:conversation', conversationId)

    const onNew = (msg: IMessage) => {
      if (msg.conversationId === conversationId) addMessage(msg)
    }
    const onEdit = (msg: IMessage) => {
      if (msg.conversationId === conversationId) updateMessage(msg)
    }
    const onDelete = (msg: IMessage) => {
      if (msg.conversationId === conversationId) updateMessage(msg)
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
      setActiveConversation(null)
      s.off('message:new', onNew)
      s.off('message:edited', onEdit)
      s.off('message:deleted', onDelete)
      s.off('typing:start', onTypingStart)
      s.off('typing:stop', onTypingStop)
    }
  }, [conversationId, addMessage, updateMessage, setTyping, setActiveConversation])

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await messagingService.getMessages(conversationId)
      setMessages(conversationId, res.data.data.items)
      return res.data.data
    },
    enabled: !!conversationId,
  })
}

export const useSendMessage = () => {
  const addMessage = useMessagingStore((s) => s.addMessage)

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      messagingService.sendMessage(conversationId, content),
    onSuccess: (res) => addMessage(res.data.data),
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
