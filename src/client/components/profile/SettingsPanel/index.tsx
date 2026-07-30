import { useState } from 'react'
import { FiTrash2, FiAlertTriangle, FiLock } from 'react-icons/fi'
import { CgSpinner } from 'react-icons/cg'
import { useNavigate } from 'react-router-dom'
import { useDeleteAccount } from '../../../hooks/useProfile.js'

export default function SettingsPanel() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const mutation = useDeleteAccount()
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (!password) {
      setError('Password is required.')
      return
    }
    setError('')
    try {
      await mutation.mutateAsync(password)
      navigate('/login?deleted=1', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deletion failed')
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2 className="profile-section-title">
          <FiLock /> Account Security
        </h2>
      </div>

      <div className="mb-4">
        <p style={{ fontSize: '.9rem', color: '#555' }}>
          Your account is protected. To change your password, use the{' '}
          <a href="/forgot-password" style={{ color: '#FF9900' }}>
            Forgot Password
          </a>{' '}
          flow — we'll send a secure reset link to your email.
        </p>
      </div>

      <hr style={{ borderColor: '#f0f0f0' }} />

      <div className="mt-4 danger-zone">
        <p className="danger-zone-title">
          <FiAlertTriangle style={{ verticalAlign: 'middle' }} /> Danger Zone
        </p>
        <p className="danger-zone-desc">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showConfirm ? (
          <button className="btn-profile-danger" onClick={() => setShowConfirm(true)}>
            <FiTrash2 /> Delete My Account
          </button>
        ) : (
          <div>
            {error && <p className="profile-alert profile-alert--error mb-3">{error}</p>}
            <p
              style={{
                fontSize: '.85rem',
                fontWeight: 600,
                color: '#dc2626',
                marginBottom: '.5rem',
              }}
            >
              Confirm your password to permanently delete this account:
            </p>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <input
                type="password"
                className="form-control"
                style={{ maxWidth: 260 }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="btn-profile-danger"
                onClick={handleDelete}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <CgSpinner className="spin" /> Deleting…
                  </>
                ) : (
                  <>
                    <FiTrash2 /> Confirm Delete
                  </>
                )}
              </button>
              <button
                className="btn-profile-ghost"
                onClick={() => {
                  setShowConfirm(false)
                  setPassword('')
                  setError('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
