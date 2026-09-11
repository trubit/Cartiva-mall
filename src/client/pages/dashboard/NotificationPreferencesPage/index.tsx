import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiBell, FiCheck, FiShield, FiArrowLeft } from 'react-icons/fi'
import api from '../../../services/api.js'
import './NotificationPreferences.css'

interface PreferenceItem {
  notificationType: string
  inApp: boolean
  email: boolean
  push: boolean
  sms: boolean
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<PreferenceItem[]>([
    { notificationType: 'order_updates', inApp: true, email: true, push: true, sms: true },
    { notificationType: 'payment_updates', inApp: true, email: true, push: true, sms: false },
    { notificationType: 'shipping_updates', inApp: true, email: true, push: true, sms: true },
    { notificationType: 'promotions', inApp: true, email: true, push: false, sms: false },
    { notificationType: 'security_alerts', inApp: true, email: true, push: true, sms: true },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await api.get<{ data: { preferences: PreferenceItem[] } }>(
          '/notifications/preferences',
        )
        if (res.data.data?.preferences) {
          setPreferences(res.data.data.preferences)
        }
      } catch {
        // Fallback to default
      } finally {
        setLoading(false)
      }
    }
    void loadPreferences()
  }, [])

  const handleToggle = (type: string, channel: 'inApp' | 'email' | 'push' | 'sms') => {
    if (type === 'security_alerts') return // Protected

    setPreferences((prev) =>
      prev.map((item) => {
        if (item.notificationType === type) {
          return { ...item, [channel]: !item[channel] }
        }
        return item
      }),
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api.patch('/notifications/preferences', { preferences })
      setMessage('Preferences saved successfully!')
    } catch {
      setMessage('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getLabel = (type: string) => {
    switch (type) {
      case 'order_updates':
        return 'Order Status & Confirmation Updates'
      case 'payment_updates':
        return 'Payment Confirmations & Refund Notices'
      case 'shipping_updates':
        return 'Carrier Dispatch & Tracking Alerts'
      case 'promotions':
        return 'Promotions, Deals & Marketing Emails'
      case 'security_alerts':
        return 'Security Events & Password Alerts (Protected)'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  if (loading) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    )
  }

  return (
    <div className="container section np-wrap">
      <div className="np-header">
        <Link to="/dashboard/notifications" className="np-back-btn">
          <FiArrowLeft size={16} /> Back to Notifications
        </Link>
        <h1 className="np-title">
          <FiBell size={24} /> Notification Preferences
        </h1>
        <p className="np-sub">Manage how you receive alerts and communications from Cartiva.</p>
      </div>

      {message && <div className="np-alert">{message}</div>}

      <div className="np-card">
        <div className="np-table-wrap">
          <table className="np-table">
            <thead>
              <tr>
                <th>Notification Type</th>
                <th>In-App</th>
                <th>Email</th>
                <th>Push</th>
                <th>SMS</th>
              </tr>
            </thead>
            <tbody>
              {preferences.map((item) => {
                const isSecurity = item.notificationType === 'security_alerts'
                return (
                  <tr key={item.notificationType}>
                    <td className="np-type-cell">
                      {getLabel(item.notificationType)}
                      {isSecurity && (
                        <FiShield
                          size={14}
                          className="np-shield-icon"
                          title="Required for security"
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.inApp}
                        disabled={isSecurity}
                        onChange={() => handleToggle(item.notificationType, 'inApp')}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.email}
                        disabled={isSecurity}
                        onChange={() => handleToggle(item.notificationType, 'email')}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.push}
                        disabled={isSecurity}
                        onChange={() => handleToggle(item.notificationType, 'push')}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.sms}
                        disabled={isSecurity}
                        onChange={() => handleToggle(item.notificationType, 'sms')}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="np-actions">
          <button onClick={handleSave} disabled={saving} className="np-save-btn">
            <FiCheck size={16} /> {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
