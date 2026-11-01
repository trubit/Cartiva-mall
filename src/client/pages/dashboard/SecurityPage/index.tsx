import { useState } from 'react'
import { FiShield, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useChangePassword } from '../../../hooks/useDashboard.js'
import { useAuthStore } from '../../../store/authStore.js'

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type ShowState = { current: boolean; new: boolean; confirm: boolean }

function PasswordInput({
  id,
  label,
  showKey,
  form,
  show,
  onFormChange,
  onToggleShow,
}: {
  id: keyof PasswordForm
  label: string
  showKey: keyof ShowState
  form: PasswordForm
  show: ShowState
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleShow: (key: keyof ShowState) => void
}) {
  return (
    <div className="dashboard-form__group">
      <label className="dashboard-form__label" htmlFor={id}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={id}
          type={show[showKey] ? 'text' : 'password'}
          value={form[id]}
          onChange={onFormChange}
          className="dashboard-form__input"
          required
          style={{ paddingRight: '2.5rem' }}
        />
        <button
          type="button"
          onClick={() => onToggleShow(showKey)}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-neutral-500)',
            display: 'flex',
            padding: 0,
          }}
          aria-label={show[showKey] ? 'Hide password' : 'Show password'}
        >
          {show[showKey] ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </div>
  )
}

export default function SecurityPage() {
  const changePassword = useChangePassword()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)

  const hasExistingPassword =
    user?.hasPassword !== false && (user?.authProvider !== 'google' || Boolean(user?.hasPassword))

  const [form, setForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [show, setShow] = useState<ShowState>({
    current: false,
    new: false,
    confirm: false,
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setSuccess(false)
    setError(null)
  }

  const handleToggleShow = (key: keyof ShowState) => {
    setShow((s) => ({ ...s, [key]: !s[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (hasExistingPassword && !form.currentPassword) {
      setError('Current password is required')
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (hasExistingPassword && form.newPassword === form.currentPassword) {
      setError('New password must be different from current password')
      return
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: hasExistingPassword ? form.currentPassword : '',
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      })
      setSuccess(true)
      updateUser({ hasPassword: true })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : hasExistingPassword
            ? 'Failed to change password'
            : 'Failed to set password',
      )
    }
  }

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">
          <FiShield style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Security
        </h1>
        <p className="dashboard-page-subtitle">
          Manage your account password and security settings
        </p>
      </div>

      {/* Change Password */}
      <div className="dashboard-security-card">
        <div className="dashboard-security-card__icon">
          <FiLock />
        </div>
        <div className="dashboard-security-card__content">
          <h2 className="dashboard-security-card__title">
            {hasExistingPassword ? 'Change Password' : 'Set Account Password'}
          </h2>
          <p className="dashboard-security-card__text">
            {hasExistingPassword
              ? "Use a strong password that you don't use on other websites. At least 8 characters."
              : 'You currently sign in using Google. Establishing a password allows you to sign in using both Google and email/password.'}
          </p>

          {success && (
            <div className="dashboard-alert dashboard-alert--success">
              ✓{' '}
              {hasExistingPassword
                ? 'Password changed successfully. You may need to log in again on other devices.'
                : 'Password set successfully! You can now log in using your email and password.'}
            </div>
          )}
          {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}

          <form onSubmit={handleSubmit} className="dashboard-form">
            {hasExistingPassword && (
              <PasswordInput
                id="currentPassword"
                label="Current Password"
                showKey="current"
                form={form}
                show={show}
                onFormChange={handleChange}
                onToggleShow={handleToggleShow}
              />
            )}
            <PasswordInput
              id="newPassword"
              label={hasExistingPassword ? 'New Password' : 'Password'}
              showKey="new"
              form={form}
              show={show}
              onFormChange={handleChange}
              onToggleShow={handleToggleShow}
            />
            <PasswordInput
              id="confirmPassword"
              label={hasExistingPassword ? 'Confirm New Password' : 'Confirm Password'}
              showKey="confirm"
              form={form}
              show={show}
              onFormChange={handleChange}
              onToggleShow={handleToggleShow}
            />
            <div className="dashboard-form__actions">
              <button
                type="submit"
                className="dashboard-btn dashboard-btn--primary"
                disabled={changePassword.isPending}
              >
                <FiLock />
                {changePassword.isPending
                  ? hasExistingPassword
                    ? 'Updating...'
                    : 'Setting...'
                  : hasExistingPassword
                    ? 'Update Password'
                    : 'Set Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Tips */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Security Tips</h2>
        </div>
        <div className="dashboard-section__body">
          <ul
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-neutral-600)',
              lineHeight: 1.8,
              paddingLeft: '1.25rem',
            }}
          >
            <li>Use a unique password not used on other sites</li>
            <li>Include uppercase, lowercase, numbers and symbols</li>
            <li>Never share your password with anyone</li>
            <li>Enable two-factor authentication when available</li>
            <li>Log out from shared or public devices</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
