import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiX, FiRefreshCw, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore.js'
import { useResendVerification } from '../../../hooks/useAuth.js'

export default function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)
  const { mutate: resend, isPending, isSuccess } = useResendVerification()

  if (!user || user.emailVerified || dismissed) return null

  return (
    <div className="ev-banner">
      <div className="container ev-banner__inner">
        <span className="ev-banner__icon">
          <FiAlertTriangle size={15} />
        </span>

        <p className="ev-banner__text">
          <FiMail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Your email <strong>{user.email}</strong> is not verified. Check your inbox for the
          verification link, or{' '}
          {isSuccess ? (
            <span className="ev-banner__sent">
              <FiCheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              New link sent — check your inbox &amp; spam folder.
            </span>
          ) : (
            <button
              type="button"
              onClick={() => resend(user.email)}
              disabled={isPending}
              className="ev-banner__resend-btn"
            >
              {isPending ? (
                <>
                  <FiRefreshCw size={11} className="animate-spin" /> sending…
                </>
              ) : (
                'resend it now'
              )}
            </button>
          )}{' '}
          <Link to="/verify-email" className="ev-banner__link">
            Already verified? Click here
          </Link>
        </p>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ev-banner__close"
          aria-label="Dismiss"
        >
          <FiX size={15} />
        </button>
      </div>
    </div>
  )
}
