import { create } from 'zustand'
import type { IConversation, IMessage } from '../../shared/types/messaging.types.js'

interface TypingState {
  [conversationId: string]: string[] // array of userIds currently typing
}

interface MessagingStore {
  conversations: IConversation[]
  activeConversationId: string | null
  messages: Record<string, IMessage[]>
  typing: TypingState
  unreadTotal: number

  setConversations: (convos: IConversation[]) => void
  addConversation: (convo: IConversation) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, msgs: IMessage[]) => void
  prependMessages: (conversationId: string, msgs: IMessage[]) => void
  addMessage: (msg: IMessage) => void
  updateMessage: (msg: IMessage) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
  setUnreadTotal: (n: number) => void
  incrementUnread: () => void
}

export const useMessagingStore = create<MessagingStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typing: {},
  unreadTotal: 0,

  setConversations: (convos) => set({ conversations: convos }),

  addConversation: (convo) =>
    set((s) => ({
      conversations: s.conversations.some((c) => c._id === convo._id)
        ? s.conversations
        : [convo, ...s.conversations],
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: msgs } })),

  prependMessages: (conversationId, msgs) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...msgs, ...(s.messages[conversationId] ?? [])],
      },
    })),

  addMessage: (msg) =>
    set((s) => {
      const cid = msg.conversationId
      const existing = s.messages[cid] ?? []
      return { messages: { ...s.messages, [cid]: [...existing, msg] } }
    }),

  updateMessage: (msg) =>
    set((s) => {
      const cid = msg.conversationId
      const existing = s.messages[cid] ?? []
      return {
        messages: {
          ...s.messages,
          [cid]: existing.map((m) => (m._id === msg._id ? msg : m)),
        },
      }
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((s) => {
      const current = s.typing[conversationId] ?? []
      const next = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId)
      return { typing: { ...s.typing, [conversationId]: next } }
    }),

  setUnreadTotal: (n) => set({ unreadTotal: n }),
  incrementUnread: () => set((s) => ({ unreadTotal: s.unreadTotal + 1 })),
}))
