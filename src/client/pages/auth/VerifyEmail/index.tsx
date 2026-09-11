import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FiCheckCircle, FiXCircle, FiMail, FiRefreshCw } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import OtpInput from '../../../../client/components/auth/OtpInput/index.js'
import LoadingSpinner from '../../../../client/components/ui/LoadingSpinner.js'
import { useVerifyEmail, useVerifyEmailOtp, useResendOtp } from '../../../hooks/useAuth.js'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const emailParam = params.get('email') ?? ''

  const [email, setEmail] = useState(emailParam)
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Legacy link-based verification
  const {
    isLoading: legacyLoading,
    isSuccess: legacySuccess,
    isError: legacyError,
    error: legacyErrObj,
  } = useVerifyEmail(token)

  // Modern 6-Digit OTP verification
  const {
    mutate: verifyOtp,
    isPending: verifyingOtp,
    isError: otpError,
    error: otpErrObj,
  } = useVerifyEmailOtp()

  const { mutate: resend, isPending: resending, isSuccess: resentSuccess } = useResendOtp()

  const otpErrorMessage = (otpErrObj as { response?: { data?: { message?: string } } })?.response
    ?.data?.message

  // 60-second cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || otp.length !== 6) return
    verifyOtp({ email: email.trim(), otp })
  }

  const handleResend = () => {
    if (!email.trim() || !canResend) return
    resend(
      { email: email.trim(), purpose: 'EMAIL_VERIFICATION' },
      {
        onSuccess: () => {
          setResendCooldown(60)
          setCanResend(false)
          setOtp('')
        },
      },
    )
  }

  // ─── Legacy Token Verification Render ─────────────────────────────────────────
  if (token) {
    return (
      <AuthFormCard title="Email Verification">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}
        >
          {legacyLoading && (
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

          {legacySuccess && (
            <>
              <div
                className="auth-verify-icon auth-verify-success"
                style={{ margin: '0 auto var(--space-4)' }}
              >
                <FiCheckCircle size={36} color="var(--color-success)" />
              </div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Email Verified!</h3>
              <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
                Your email address has been verified. You can now sign in.
              </p>
              <Link
                to="/login"
                className="auth-btn auth-btn-primary"
                style={{ display: 'inline-flex' }}
              >
                Sign In to Your Account
              </Link>
            </>
          )}

          {legacyError && (
            <>
              <div
                className="auth-verify-icon auth-verify-error"
                style={{ margin: '0 auto var(--space-4)' }}
              >
                <FiXCircle size={36} color="var(--color-danger)" />
              </div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Verification Link Expired</h3>
              <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-5)' }}>
                {(legacyErrObj as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'This link is invalid or has expired.'}
              </p>
              <Link to="/verify-email" className="auth-link">
                Use 6-Digit Code Instead
              </Link>
            </>
          )}
        </motion.div>
      </AuthFormCard>
    )
  }

  // ─── Modern 6-Digit OTP Verification Render ──────────────────────────────────
  return (
    <AuthFormCard
      title="Verify Your Email"
      subtitle={
        email ? `Enter the 6-digit code sent to ${email}` : 'Enter your email and 6-digit code'
      }
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {otpError && otpErrorMessage && (
          <div className="auth-alert auth-alert-error" style={{ marginBottom: '16px' }}>
            <FiXCircle /> {otpErrorMessage}
          </div>
        )}

        {resentSuccess && (
          <div className="auth-alert auth-alert-success" style={{ marginBottom: '16px' }}>
            <FiCheckCircle /> A fresh 6-digit code has been sent to your email.
          </div>
        )}

        <form onSubmit={handleVerifyOtp} noValidate>
          {!emailParam && (
            <AuthInput
              id="verify-email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              icon={<FiMail />}
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              required
            />
          )}

          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-neutral-700)',
                marginBottom: '4px',
              }}
            >
              6-Digit Verification Code
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(completedOtp) => {
                if (email.trim()) {
                  verifyOtp({ email: email.trim(), otp: completedOtp })
                }
              }}
              disabled={verifyingOtp}
              error={!!otpError}
            />
          </div>

          <button
            type="submit"
            disabled={verifyingOtp || otp.length !== 6 || !email.trim()}
            className="auth-btn auth-btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {verifyingOtp ? (
              <>
                <FiRefreshCw size={14} className="spin" /> Verifying Code…
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </form>

        {/* Resend Action & Countdown */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-neutral-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 'var(--text-xs)',
          }}
        >
          <span style={{ color: 'var(--color-neutral-500)' }}>
            {canResend ? "Didn't receive the code?" : `Resend available in ${resendCooldown}s`}
          </span>

          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || resending || !email.trim()}
            style={{
              background: 'none',
              border: 'none',
              color:
                canResend && email.trim()
                  ? 'var(--color-brand-accent, #FF9900)'
                  : 'var(--color-neutral-400)',
              fontWeight: 700,
              cursor: canResend && email.trim() ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            {resending ? 'Sending…' : 'Resend Code'}
          </button>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/login" className="auth-link" style={{ fontSize: 'var(--text-xs)' }}>
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </AuthFormCard>
  )
}
