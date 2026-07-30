import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FiCheckCircle, FiXCircle, FiMail, FiRefreshCw } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import LoadingSpinner from '../../../../client/components/ui/LoadingSpinner.js'
import { useVerifyEmail, useResendVerification } from '../../../hooks/useAuth.js'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const { isLoading, isSuccess, isError, error } = useVerifyEmail(token)
  const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message

  const { mutate: resend, isPending: resending, isSuccess: resent } = useResendVerification()
  const [resendEmail, setResendEmail] = useState('')

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault()
    if (resendEmail.trim()) resend(resendEmail.trim())
  }

  if (!token) {
    return (
      <AuthFormCard title="Missing Token">
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <div
            className="auth-verify-icon auth-verify-error"
            style={{ margin: '0 auto var(--space-4)' }}
          >
            <FiXCircle size={36} color="var(--color-danger)" />
          </div>
          <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
            This verification link is invalid. Enter your email below to get a new one.
          </p>
          {resent ? (
            <div className="auth-alert auth-alert-success">
              <FiCheckCircle />
              Sent! Check your Gmail inbox (and spam folder).
            </div>
          ) : (
            <form onSubmit={handleResend} style={{ textAlign: 'left' }}>
              <AuthInput
                id="resend-email"
                label="Your email address"
                type="email"
                placeholder="you@gmail.com"
                icon={<FiMail />}
                value={resendEmail}
                onChange={(e) => setResendEmail((e.target as HTMLInputElement).value)}
              />
              <button
                type="submit"
                disabled={resending || !resendEmail}
                className="auth-btn auth-btn-primary"
              >
                {resending ? (
                  <>
                    <FiRefreshCw size={14} /> Sending…
                  </>
                ) : (
                  'Send new verification link'
                )}
              </button>
            </form>
          )}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/login" className="auth-link">
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthFormCard>
    )
  }

  return (
    <AuthFormCard title="Email Verification">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}
      >
        {isLoading && (
          <>
            <div
              className="auth-verify-icon auth-verify-loading"
              style={{ margin: '0 auto var(--space-4)' }}
            >
              <LoadingSpinner size="md" />
            </div>
            <p style={{ color: 'var(--color-neutral-600)' }}>Verifying your email address…</p>
          </>
        )}

        {isSuccess && (
          <>
            <div
              className="auth-verify-icon auth-verify-success"
              style={{ margin: '0 auto var(--space-4)' }}
            >
              <FiCheckCircle size={36} color="var(--color-success)" />
            </div>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Email Verified!</h3>
            <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
              Your Gmail address has been verified. You can now sign in.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 42,
                background: 'var(--color-brand-accent)',
                color: 'var(--color-brand-text)',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
              }}
            >
              Sign In to Your Account
            </Link>
          </>
        )}

        {isError && (
          <>
            <div
              className="auth-verify-icon auth-verify-error"
              style={{ margin: '0 auto var(--space-4)' }}
            >
              <FiXCircle size={36} color="var(--color-danger)" />
            </div>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Verification Failed</h3>
            <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-5)' }}>
              {errorMsg ?? 'This link is invalid or has expired.'}
            </p>

            {resent ? (
              <div className="auth-alert auth-alert-success" style={{ textAlign: 'left' }}>
                <FiCheckCircle />A new verification link has been sent to your Gmail inbox.
              </div>
            ) : (
              <form onSubmit={handleResend} style={{ textAlign: 'left' }}>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Enter your email address to receive a new link:
                </p>
                <AuthInput
                  id="resend-email"
                  label="Email address"
                  type="email"
                  placeholder="you@gmail.com"
                  icon={<FiMail />}
                  value={resendEmail}
                  onChange={(e) => setResendEmail((e.target as HTMLInputElement).value)}
                />
                <button
                  type="submit"
                  disabled={resending || !resendEmail}
                  className="auth-btn auth-btn-primary"
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  {resending ? (
                    <>
                      <FiRefreshCw size={14} /> Sending…
                    </>
                  ) : (
                    'Send new verification link'
                  )}
                </button>
              </form>
            )}
            <Link
              to="/login"
              className="auth-link"
              style={{ display: 'block', marginTop: 'var(--space-2)' }}
            >
              Back to Sign In
            </Link>
          </>
        )}
      </motion.div>
    </AuthFormCard>
  )
}
