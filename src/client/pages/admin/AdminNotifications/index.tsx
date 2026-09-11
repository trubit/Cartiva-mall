import { useState } from 'react'
import { FiBell, FiSend } from 'react-icons/fi'
import api from '../../../services/api.js'
import './AdminNotifications.css'

export default function AdminNotifications() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return

    setSending(true)
    setStatusMsg(null)
    try {
      const res = await api.post<{ message: string; data: { broadcastId: string } }>(
        '/notifications/admin/broadcast',
        { title, message, link },
      )
      setStatusMsg(`Broadcast queued successfully! ID: ${res.data.data?.broadcastId ?? 'BC-OK'}`)
      setTitle('')
      setMessage('')
      setLink('')
    } catch {
      setStatusMsg('Failed to queue broadcast notification.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="an-wrap">
      <div className="an-header">
        <h1 className="an-title">
          <FiBell size={24} /> Admin Notification Broadcast
        </h1>
        <p className="an-sub">Broadcast platform-wide in-app and email announcements to users.</p>
      </div>

      {statusMsg && <div className="an-alert">{statusMsg}</div>}

      <div className="an-card">
        <form onSubmit={handleBroadcast} className="an-form">
          <div className="an-field">
            <label className="an-label">Notification Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Maintenance Announcement"
              className="an-input"
            />
          </div>

          <div className="an-field">
            <label className="an-label">Message Body</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement details..."
              className="an-textarea"
            />
          </div>

          <div className="an-field">
            <label className="an-label">Target Link (Optional)</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g. /deals or /dashboard"
              className="an-input"
            />
          </div>

          <div className="an-actions">
            <button type="submit" disabled={sending} className="an-send-btn">
              <FiSend size={16} /> {sending ? 'Queuing Broadcast...' : 'Broadcast Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
