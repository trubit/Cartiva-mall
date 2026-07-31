import { useState, useEffect } from 'react'
import { FiUser, FiSave } from 'react-icons/fi'
import { useDashboardSummary, useUpdateSettings } from '../../../hooks/useDashboard.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'

type FormState = {
  firstName: string
  lastName: string
  phoneNumber: string
  bio: string
}

export default function AccountSettingsPage() {
  const { data, isLoading } = useDashboardSummary()
  const updateSettings = useUpdateSettings()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    bio: '',
  })

  useEffect(() => {
    if (data?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        firstName: data.user.firstName ?? '',
        lastName: data.user.lastName ?? '',
        phoneNumber: data.user.phoneNumber ?? '',
        bio: data.user.bio ?? '',
      })
    }
  }, [data?.user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setSaved(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await updateSettings.mutateAsync(form)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">
          <FiUser style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Account Settings
        </h1>
        <p className="dashboard-page-subtitle">Update your personal information</p>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Personal Information</h2>
        </div>
        <div className="dashboard-section__body">
          {saved && (
            <div className="dashboard-alert dashboard-alert--success">
              ✓ Settings saved successfully
            </div>
          )}
          {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}

          <form onSubmit={handleSubmit} className="dashboard-form">
            <div className="dashboard-form__row">
              <div className="dashboard-form__group">
                <label className="dashboard-form__label" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange}
                  className="dashboard-form__input"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
              <div className="dashboard-form__group">
                <label className="dashboard-form__label" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  className="dashboard-form__input"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="dashboard-form__group">
              <label className="dashboard-form__label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={data?.user.email ?? ''}
                className="dashboard-form__input"
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
              <span className="dashboard-form__help">
                Email cannot be changed. Contact support if needed.
              </span>
            </div>

            <div className="dashboard-form__group">
              <label className="dashboard-form__label" htmlFor="phoneNumber">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={handleChange}
                className="dashboard-form__input"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="dashboard-form__group">
              <label className="dashboard-form__label" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                className="dashboard-form__textarea"
                placeholder="Tell us a little about yourself..."
                maxLength={500}
              />
              <span className="dashboard-form__help">{form.bio.length}/500</span>
            </div>

            <div className="dashboard-form__actions">
              <button
                type="submit"
                className="dashboard-btn dashboard-btn--primary"
                disabled={updateSettings.isPending}
              >
                <FiSave />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
