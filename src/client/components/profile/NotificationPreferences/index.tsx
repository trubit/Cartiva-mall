import { useState } from 'react'
import { FiBell, FiSave } from 'react-icons/fi'
import { CgSpinner } from 'react-icons/cg'
import { useUpdateNotifications } from '../../../hooks/useProfile.js'
import type { IUser, INotificationSettings } from '../../../../shared/types/user.types.js'

interface Props {
  user: IUser
}

const NOTIFICATIONS: { key: keyof INotificationSettings; title: string; desc: string }[] = [
  {
    key: 'emailNotifications',
    title: 'Email Notifications',
    desc: 'Receive notifications via email',
  },
  { key: 'pushNotifications', title: 'Push Notifications', desc: 'Browser and mobile push alerts' },
  { key: 'orderUpdates', title: 'Order Updates', desc: 'Shipping, delivery, and order status' },
  {
    key: 'promotions',
    title: 'Promotions & Deals',
    desc: 'Flash sales, coupons and special offers',
  },
  { key: 'newsletter', title: 'Newsletter', desc: 'Weekly updates and featured products' },
]

const defaultSettings: INotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  orderUpdates: true,
  promotions: false,
  newsletter: false,
}

export default function NotificationPreferences({ user }: Props) {
  const current = user.notificationSettings ?? defaultSettings
  const [values, setValues] = useState<INotificationSettings>({ ...defaultSettings, ...current })
  const [success, setSuccess] = useState('')
  const mutation = useUpdateNotifications()

  const toggle = (key: keyof INotificationSettings) =>
    setValues((prev) => ({ ...prev, [key]: !prev[key] }))

  const onSave = async () => {
    setSuccess('')
    try {
      await mutation.mutateAsync(values)
      setSuccess('Notification preferences saved.')
    } catch {
      /* surface below */
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2 className="profile-section-title">
          <FiBell /> Notifications
        </h2>
      </div>

      {success && <p className="profile-alert profile-alert--success">{success}</p>}
      {mutation.error && (
        <p className="profile-alert profile-alert--error">
          {mutation.error instanceof Error ? mutation.error.message : 'Save failed'}
        </p>
      )}

      {NOTIFICATIONS.map(({ key, title, desc }) => (
        <div className="notif-row" key={key}>
          <div className="notif-info">
            <h6>{title}</h6>
            <p>{desc}</p>
          </div>
          <label className="notif-toggle">
            <input type="checkbox" checked={values[key]} onChange={() => toggle(key)} />
            <span className="notif-slider" />
          </label>
        </div>
      ))}

      <div className="profile-form-actions mt-3">
        <button className="btn-profile-primary" onClick={onSave} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <CgSpinner className="spin" /> Saving…
            </>
          ) : (
            <>
              <FiSave /> Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  )
}
