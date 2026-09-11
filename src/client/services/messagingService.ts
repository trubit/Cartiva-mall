import api from './api'
import type {
  IConversation,
  IMessage,
  ConversationList,
  MessageList,
} from '../../shared/types/messaging.types.js'

export const messagingService = {
  startConversation: (
    recipientId: string,
    opts?: { productId?: string; orderId?: string; subject?: string },
  ) => api.post<{ data: IConversation }>('/messaging/conversations', { recipientId, ...opts }),

  listConversations: (page = 1, limit = 20) =>
    api.get<{ data: ConversationList }>('/messaging/conversations', { params: { page, limit } }),

  getConversation: (id: string) =>
    api.get<{ data: IConversation }>(`/messaging/conversations/${id}`),

  sendMessage: (
    conversationId: string,
    content: string,
    type: 'text' | 'image' = 'text',
    imageUrl?: string,
  ) =>
    api.post<{ data: IMessage }>('/messaging/messages', {
      conversationId,
      content,
      type,
      imageUrl,
    }),

  getMessages: (conversationId: string, page = 1, limit = 30) =>
    api.get<{ data: MessageList }>(`/messaging/messages/${conversationId}`, {
      params: { page, limit },
    }),

  editMessage: (id: string, content: string) =>
    api.put<{ data: IMessage }>(`/messaging/messages/${id}`, { content }),

  deleteMessage: (id: string) => api.delete(`/messaging/messages/${id}`),

  getUnreadCount: () =>
    api.get<{ data: { unreadConversations: number; unreadMessages: number } }>(
      '/messaging/unread-count',
    ),
}
