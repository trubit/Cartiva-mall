import { useState } from 'react'
import { FiSend, FiMessageSquare, FiArrowLeft } from 'react-icons/fi'
import {
  useConversations,
  useMessages,
  useSendMessage,
  useTypingIndicator,
} from '../../../hooks/useMessaging.js'
import { useMessagingStore } from '../../../store/messagingStore.js'
import { useAuthStore } from '../../../store/authStore.js'
import { useIsMobile } from '../../../hooks/useBreakpoint.js'

function ConversationList({
  activeId,
  onSelect,
}: {
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const { data, isPending } = useConversations()
  const conversations = data?.items ?? []

  if (isPending) return <p style={{ padding: 16, opacity: 0.5, fontSize: 13 }}>Loading…</p>
  if (!conversations.length)
    return <p style={{ padding: 16, opacity: 0.5, fontSize: 13 }}>No conversations yet</p>

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {conversations.map((c) => {
        const other = c.participants[0]
        const name = other ? `${other.firstName} ${other.lastName}` : 'Unknown'
        return (
          <li
            key={c._id}
            onClick={() => onSelect(c._id)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              background: activeId === c._id ? 'rgba(255,153,0,0.1)' : 'transparent',
              borderBottom: '1px solid var(--border-color, #eee)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
            {c.lastMessage && (
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.lastMessage}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ChatPanel({
  conversationId,
  onBack,
}: {
  conversationId: string
  onBack?: () => void
}) {
  const [text, setText] = useState('')
  const { isPending } = useMessages(conversationId)
  const sendMessage = useSendMessage()
  const { onType } = useTypingIndicator(conversationId)
  const messages = useMessagingStore((s) => s.messages[conversationId] ?? [])
  const typing = useMessagingStore((s) => s.typing[conversationId] ?? [])
  const userId = useAuthStore((s) => s.user?._id)

  const handleSend = () => {
    const content = text.trim()
    if (!content) return
    sendMessage.mutate({ conversationId, content })
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mobile back header */}
      {onBack && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color, #eee)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
            }}
          >
            <FiArrowLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Chat</span>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {isPending && (
          <p style={{ opacity: 0.5, fontSize: 13, textAlign: 'center' }}>Loading messages…</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId._id === userId
          return (
            <div
              key={msg._id}
              style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '8px 12px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMine ? '#FF9900' : 'var(--bg-secondary, #f0f0f0)',
                  color: isMine ? '#000' : 'inherit',
                  fontSize: 14,
                  wordBreak: 'break-word',
                }}
              >
                {msg.deletedAt ? <em style={{ opacity: 0.5 }}>[Message deleted]</em> : msg.content}
              </div>
            </div>
          )
        })}
        {typing.length > 0 && (
          <p style={{ fontSize: 12, opacity: 0.5, fontStyle: 'italic' }}>Typing…</p>
        )}
      </div>

      {/* Input bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 16px',
          borderTop: '1px solid var(--border-color, #eee)',
          flexShrink: 0,
        }}
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onType()
          }}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            padding: '8px 12px',
            border: '1px solid var(--border-color, #ccc)',
            borderRadius: 20,
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            background: 'var(--bg-secondary, #f9f9f9)',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          aria-label="Send"
          style={{
            background: '#FF9900',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            opacity: text.trim() ? 1 : 0.6,
          }}
        >
          <FiSend size={16} color="#000" />
        </button>
      </div>
    </div>
  )
}

export default function MessagingPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const isMobile = useIsMobile(768)

  // Mobile: single-panel sliding view
  if (isMobile) {
    return (
      <div
        style={{
          height: 'calc(100dvh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-color, #eee)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {activeId ? (
          <ChatPanel
            key={activeId}
            conversationId={activeId}
            onBack={() => setActiveId(null)}
          />
        ) : (
          <>
            <div
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color, #eee)', flexShrink: 0 }}
            >
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Messages</h2>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ConversationList activeId={activeId} onSelect={setActiveId} />
            </div>
          </>
        )}
      </div>
    )
  }

  // Desktop: side-by-side
  return (
    <div
      style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        border: '1px solid var(--border-color, #eee)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Conversation list */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid var(--border-color, #eee)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color, #eee)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Messages</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ConversationList activeId={activeId} onSelect={setActiveId} />
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeId ? (
          <ChatPanel key={activeId} conversationId={activeId} />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.4,
            }}
          >
            <FiMessageSquare size={48} />
            <p style={{ marginTop: 12, fontSize: 15 }}>Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
