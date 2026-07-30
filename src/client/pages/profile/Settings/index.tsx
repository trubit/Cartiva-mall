import { useState } from 'react'
import { FiBell, FiShield } from 'react-icons/fi'
import { useProfile } from '../../../hooks/useProfile.js'
import NotificationPreferences from '../../../components/profile/NotificationPreferences/index.js'
import SettingsPanel from '../../../components/profile/SettingsPanel/index.js'

type Tab = 'notifications' | 'security'

export default function Settings() {
  const { data: user, isLoading } = useProfile()
  const [tab, setTab] = useState<Tab>('notifications')

  if (isLoading || !user)
    return <div className="profile-skeleton" style={{ height: 400, borderRadius: 12 }} />

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2 className="profile-section-title">Settings</h2>
      </div>

      <div className="settings-tab-list">
        <button
          className={`settings-tab${tab === 'notifications' ? ' active' : ''}`}
          onClick={() => setTab('notifications')}
        >
          <FiBell /> Notifications
        </button>
        <button
          className={`settings-tab${tab === 'security' ? ' active' : ''}`}
          onClick={() => setTab('security')}
        >
          <FiShield /> Security &amp; Account
        </button>
      </div>

      {tab === 'notifications' && <NotificationPreferences user={user} />}
      {tab === 'security' && <SettingsPanel />}
    </div>
  )
}
