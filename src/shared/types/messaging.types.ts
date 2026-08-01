export type MessageType = 'text' | 'image'

export interface IParticipant {
  _id: string
  firstName: string
  lastName: string
  avatar?: string
}

export interface IConversation {
  _id: string
  participants: IParticipant[]
  productId?: { _id: string; title: string; images: string[] }
  orderId?: string
  subject?: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCounts?: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface IMessage {
  _id: string
  conversationId: string
  senderId: IParticipant
  content: string
  type: MessageType
  imageUrl?: string
  readBy: string[]
  editedAt?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ConversationList {
  items: IConversation[]
  total: number
  page: number
  pages: number
}

export interface MessageList {
  items: IMessage[]
  total: number
  page: number
  pages: number
}
