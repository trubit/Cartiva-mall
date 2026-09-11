import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, Link, Navigate, useLocation } from 'react-router-dom'
import {
  FiSend,
  FiMessageSquare,
  FiArrowLeft,
  FiSearch,
  FiShoppingBag,
  FiCheck,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi'
import {
  useConversations,
  useMessages,
  useSendMessage,
  useTypingIndicator,
  useStartConversation,
} from '../../../hooks/useMessaging.js'
import { useMessagingStore } from '../../../store/messagingStore.js'
import { useAuthStore } from '../../../store/authStore.js'
import { useIsMobile } from '../../../hooks/useBreakpoint.js'
import type {
  IConversation,
  IParticipant,
  IMessage,
} from '../../../../shared/types/messaging.types.js'

function formatMessageTime(iso?: string | Date) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatConvoTime(iso?: string | Date) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getOtherParticipant(convo: IConversation, currentUserId?: string): IParticipant {
  if (!convo.participants || convo.participants.length === 0) {
    return { _id: '', firstName: 'Marketplace', lastName: 'User' }
  }
  const other = convo.participants.find((p) => String(p._id) !== String(currentUserId))
  return other || convo.participants[0]
}

interface ConversationListProps {
  conversations: IConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  currentUserId?: string
  search: string
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  currentUserId,
  search,
}: ConversationListProps) {
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) => {
      const other = getOtherParticipant(c, currentUserId)
      const name = `${other.firstName} ${other.lastName}`.toLowerCase()
      const lastMsg = (c.lastMessage ?? '').toLowerCase()
      const prod = (c.productId?.title ?? '').toLowerCase()
      return name.includes(q) || lastMsg.includes(q) || prod.includes(q)
    })
  }, [conversations, search, currentUserId])

  if (!conversations.length) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
        <FiMessageSquare size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: '0.85rem' }}>No conversations yet</p>
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>No matching conversations</p>
      </div>
    )
  }

  return (
    <ul className="msg-convo-list">
      {filtered.map((c) => {
        const other = getOtherParticipant(c, currentUserId)
        const fullName = `${other.firstName} ${other.lastName}`.trim() || 'User'
        const initials =
          `${other.firstName?.[0] || ''}${other.lastName?.[0] || ''}`.toUpperCase() || 'U'
        const counts = c.unreadCounts as Record<string, number> | undefined
        const unread = currentUserId && counts ? (counts[currentUserId] ?? 0) : 0
        const isActive = activeId === c._id

        return (
          <li
            key={c._id}
            onClick={() => onSelect(c._id)}
            className={`msg-convo-item ${isActive ? 'msg-convo-item--active' : ''}`}
          >
            <div className="msg-avatar-wrap">
              <div className="msg-avatar">
                {other.avatar ? <img src={other.avatar} alt={fullName} /> : <span>{initials}</span>}
              </div>
            </div>

            <div className="msg-convo-info">
              <div className="msg-convo-top">
                <span className="msg-convo-name" style={{ fontWeight: unread > 0 ? 800 : 700 }}>
                  {fullName}
                </span>
                <span className="msg-convo-time">
                  {formatConvoTime(c.lastMessageAt || c.updatedAt)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <p
                  className="msg-convo-preview"
                  style={{
                    fontWeight: unread > 0 ? 700 : 400,
                    color: unread > 0 ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
                  }}
                >
                  {c.lastMessage || 'Started a conversation'}
                </p>
                {unread > 0 && (
                  <span className="msg-unread-pill">{unread > 9 ? '9+' : unread}</span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const EMPTY_MESSAGES: IMessage[] = []
const EMPTY_TYPING: string[] = []

function ChatPanel({
  conversationId,
  onBack,
  convo,
  currentUserId,
}: {
  conversationId: string
  onBack?: () => void
  convo?: IConversation
  currentUserId?: string
}) {
  const [text, setText] = useState('')
  const { isPending } = useMessages(conversationId)
  const sendMessage = useSendMessage()
  const { onType } = useTypingIndicator(conversationId)
  const messages = useMessagingStore((s) => s.messages[conversationId]) ?? EMPTY_MESSAGES
  const typing = useMessagingStore((s) => s.typing[conversationId]) ?? EMPTY_TYPING
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const other = convo ? getOtherParticipant(convo, currentUserId) : null
  const otherName = other ? `${other.firstName} ${other.lastName}`.trim() : 'Chat'
  const otherInitials = other
    ? `${other.firstName?.[0] || ''}${other.lastName?.[0] || ''}`.toUpperCase()
    : 'U'

  // Scroll to bottom on load / new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing.length])

  const handleSend = () => {
    const content = text.trim()
    if (!content || sendMessage.isPending) return
    sendMessage.mutate({ conversationId, content })
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="msg-chat-panel">
      {/* Chat Header */}
      <div className="msg-chat-header">
        <div className="msg-chat-header__user">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back to conversations"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px 4px 0',
                display: 'flex',
                alignItems: 'center',
                color: 'inherit',
              }}
            >
              <FiArrowLeft size={20} />
            </button>
          )}

          <div className="msg-avatar-wrap">
            <div className="msg-avatar" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>
              {other?.avatar ? (
                <img src={other.avatar} alt={otherName} />
              ) : (
                <span>{otherInitials}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 className="msg-chat-header__name">{otherName}</h3>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Active
            </span>
          </div>
        </div>

        {/* Product Reference Card if scoped */}
        {convo?.productId && typeof convo.productId === 'object' && (
          <Link
            to={`/products/${convo.productId._id}`}
            className="msg-product-ref hide-mobile"
            title={convo.productId.title}
          >
            <FiShoppingBag size={14} style={{ color: '#007185', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {convo.productId.title}
            </span>
          </Link>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="msg-messages-body">
        {isPending && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-neutral-400)' }}>
            <FiClock style={{ marginRight: 6 }} /> Loading message history...
          </div>
        )}

        {messages.map((msg: IMessage) => {
          const senderIdStr =
            typeof msg.senderId === 'object' && msg.senderId !== null
              ? String((msg.senderId as any)._id)
              : String(msg.senderId)
          const isMine = senderIdStr === String(currentUserId)

          return (
            <div
              key={msg._id}
              className={`msg-bubble-wrap ${isMine ? 'msg-bubble-wrap--mine' : 'msg-bubble-wrap--theirs'}`}
            >
              <div className={`msg-bubble ${isMine ? 'msg-bubble--mine' : 'msg-bubble--theirs'}`}>
                {msg.deletedAt ? (
                  <em style={{ opacity: 0.6 }}>[Message deleted]</em>
                ) : (
                  <span>{msg.content}</span>
                )}
                <div className="msg-bubble__meta">
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {isMine && (
                    <span title={msg.readBy?.length > 1 ? 'Read' : 'Sent'}>
                      {msg.readBy?.length > 1 ? <FiCheckCircle size={11} /> : <FiCheck size={11} />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="msg-typing-box">
            <span>{otherName} is typing</span>
            <span className="msg-typing-dot" />
            <span className="msg-typing-dot" />
            <span className="msg-typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input Bar */}
      <div className="msg-composer-wrap">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onType()
          }}
          onKeyDown={handleKey}
          placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="msg-composer-input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          className="msg-send-btn"
          aria-label="Send message"
        >
          <FiSend />
        </button>
      </div>
    </div>
  )
}

export default function MessagingPage() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [searchParams] = useSearchParams()
  const conversationIdParam = searchParams.get('conversationId')
  const recipientIdParam = searchParams.get('recipientId')
  const productIdParam = searchParams.get('productId')

  const [activeId, setActiveId] = useState<string | null>(conversationIdParam)
  const [search, setSearch] = useState('')
  const isMobile = useIsMobile(768)

  const { data, isPending } = useConversations()
  const startConvoMutation = useStartConversation()
  const user = useAuthStore((s) => s.user)
  const currentUserId = user?._id

  const conversations = data?.items ?? []

  // If navigated with recipientId & productId (e.g. from ProductPage "Contact Seller"), start or get convo
  useEffect(() => {
    if (isAuthenticated && recipientIdParam && user?._id && recipientIdParam !== user._id) {
      startConvoMutation.mutate(
        {
          recipientId: recipientIdParam,
          productId: productIdParam || undefined,
          subject: productIdParam ? 'Inquiry about product' : undefined,
        },
        {
          onSuccess: (res) => {
            if (res.data?.data?._id) {
              setActiveId(res.data.data._id)
            }
          },
          onError: () => {},
        },
      )
    }
  }, [recipientIdParam, productIdParam, user?._id, isAuthenticated, startConvoMutation])

  const effectiveActiveId =
    activeId ?? conversationIdParam ?? (!isMobile ? (conversations[0]?._id ?? null) : null)

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }

  const activeConvo = conversations.find((c) => c._id === effectiveActiveId)

  // Mobile Single-Panel sliding view
  if (isMobile) {
    return (
      <div className="container" style={{ padding: 0 }}>
        <div className="msg-page-container">
          {activeId ? (
            <ChatPanel
              key={activeId}
              conversationId={activeId}
              onBack={() => setActiveId(null)}
              convo={activeConvo}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="msg-sidebar" style={{ width: '100%' }}>
              <div className="msg-sidebar__header">
                <h2 className="msg-sidebar__title">Messages</h2>
                <div className="msg-search-box">
                  <FiSearch className="msg-search-icon" size={14} />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="msg-search-input"
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <ConversationList
                  conversations={conversations}
                  activeId={activeId}
                  onSelect={setActiveId}
                  currentUserId={currentUserId}
                  search={search}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Desktop Side-by-Side View
  return (
    <div className="container">
      <div className="msg-page-container">
        {/* Left Sidebar */}
        <aside className="msg-sidebar">
          <div className="msg-sidebar__header">
            <div className="msg-sidebar__title">
              <span>Messages</span>
              {data?.unreadTotal && data.unreadTotal > 0 ? (
                <span className="msg-unread-pill">{data.unreadTotal} unread</span>
              ) : null}
            </div>
            <div className="msg-search-box">
              <FiSearch className="msg-search-icon" size={14} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="msg-search-input"
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isPending ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--color-neutral-400)',
                }}
              >
                Loading conversations...
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={activeId}
                onSelect={setActiveId}
                currentUserId={currentUserId}
                search={search}
              />
            )}
          </div>
        </aside>

        {/* Right Chat Panel */}
        <main className="msg-chat-panel">
          {activeId ? (
            <ChatPanel
              key={activeId}
              conversationId={activeId}
              convo={activeConvo}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="msg-empty-panel">
              <div className="msg-empty-icon">
                <FiMessageSquare />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>Your Messages</h3>
              <p
                style={{
                  margin: '0 0 1.5rem',
                  color: 'var(--color-neutral-500)',
                  maxWidth: 360,
                  fontSize: '0.9rem',
                }}
              >
                {conversations.length > 0
                  ? 'Select a conversation from the list on the left to start chatting in real time.'
                  : 'You have no messages yet. You can chat with sellers directly from any product page or order.'}
              </p>
              {conversations.length === 0 && (
                <Link
                  to="/products"
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.25rem', borderRadius: 10 }}
                >
                  <FiShoppingBag style={{ marginRight: 6 }} /> Explore Products
                </Link>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
