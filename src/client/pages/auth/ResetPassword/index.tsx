import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams, Link } from 'react-router-dom'
import { FiLock, FiMail, FiCheckCircle, FiXCircle, FiClock, FiArrowLeft } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import AuthButton from '../../../../client/components/auth/AuthButton/index.js'
import OtpInput from '../../../../client/components/auth/OtpInput/index.js'
import {
  useResetPassword,
  useVerifyResetOtp,
  useResetPasswordWithOtp,
  useResendOtp,
} from '../../../hooks/useAuth.js'
import {
  resetPasswordSchema,
  resetPasswordOtpSchema,
  type ResetPasswordInput,
  type ResetPasswordOtpInput,
} from '../../../../shared/validators/auth.validators.js'

/**
 * Masks an email address to protect customer privacy on screen
 * e.g., "customer@example.com" -> "c******r@example.com"
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [localPart, domain] = email.split('@')
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`
  }
  const maskedLocal = `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 2, 3))}${localPart[localPart.length - 1]}`
  return `${maskedLocal}@${domain}`
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const emailQuery = params.get('email') ?? ''

  // Workflow state
  const [email, setEmail] = useState<string>(emailQuery)
  const [otpValue, setOtpValue] = useState<string>('')
  const [verifiedOtp, setVerifiedOtp] = useState<string>('')
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false)
  const [resendCooldown, setResendCooldown] = useState<number>(60)
  const [canResend, setCanResend] = useState<boolean>(false)

  // Cooldown timer for OTP resend (60s countdown)
  useEffect(() => {
    if (!token && resendCooldown > 0) {
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
  }, [token, resendCooldown])

  // ─── Mutations ───────────────────────────────────────────────────────────────
  // Legacy token mutation
  const {
    mutate: resetWithToken,
    isPending: legacyPending,
    error: legacyError,
    isError: isLegacyError,
  } = useResetPassword()

  // Step 1: Verify OTP mutation
  const {
    mutate: verifyResetOtp,
    isPending: isVerifyingOtp,
    error: verifyError,
    isError: isVerifyError,
  } = useVerifyResetOtp()

  // Step 2: Set New Password mutation
  const {
    mutate: resetPasswordWithOtp,
    isPending: isResettingPassword,
    error: resetError,
    isError: isResetError,
  } = useResetPasswordWithOtp()

  // Resend OTP mutation
  const { mutate: resendOtp, isPending: isResending, isSuccess: isResentSuccess } = useResendOtp()

  // Error message extractors
  const legacyErrorMsg = (legacyError as { response?: { data?: { message?: string } } })?.response
    ?.data?.message
  const verifyErrorMsg = (verifyError as { response?: { data?: { message?: string } } })?.response
    ?.data?.message
  const resetErrorMsg = (resetError as { response?: { data?: { message?: string } } })?.response
    ?.data?.message

  // Form for Legacy Token Reset
  const {
    register: registerLegacy,
    handleSubmit: handleLegacySubmit,
    formState: { errors: legacyErrors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  })

  // Form for Modern OTP New Password Step
  const {
    register: registerNewPassword,
    handleSubmit: handleNewPasswordSubmit,
    formState: { errors: passwordErrors },
  } = useForm<ResetPasswordOtpInput>({
    resolver: zodResolver(resetPasswordOtpSchema),
  })

  // ─── Action Handlers ────────────────────────────────────────────────────────
  const executeVerify = (codeToVerify: string) => {
    const cleanEmail = email.trim()
    const cleanOtp = (codeToVerify || '').trim()
    if (!cleanEmail || cleanOtp.length !== 6 || isVerifyingOtp) return

    verifyResetOtp(
      { email: cleanEmail, otp: cleanOtp },
      {
        onSuccess: () => {
          setVerifiedOtp(cleanOtp)
          setIsOtpVerified(true)
        },
      },
    )
  }

  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executeVerify(otpValue)
  }

  const handleResend = () => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !canResend || isResending) return

    resendOtp(
      { email: cleanEmail, purpose: 'PASSWORD_RESET' },
      {
        onSuccess: () => {
          setResendCooldown(60)
          setCanResend(false)
          setOtpValue('')
          setVerifiedOtp('')
        },
      },
    )
  }

  const onNewPasswordSubmit = (data: ResetPasswordOtpInput) => {
    const cleanEmail = email.trim()
    resetPasswordWithOtp({
      ...data,
      email: cleanEmail,
      otp: verifiedOtp || otpValue,
    })
  }

  // ─── Branch A: Legacy Token-based Reset Flow ────────────────────────────────
  if (token) {
    return (
      <AuthFormCard title="Reset Password" subtitle="Enter your new password below">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isLegacyError && legacyErrorMsg && (
            <div className="auth-alert auth-alert-error" role="alert">
              <FiXCircle /> {legacyErrorMsg}
            </div>
          )}

          <form onSubmit={handleLegacySubmit((d) => resetWithToken(d))} noValidate>
            <input type="hidden" {...registerLegacy('token')} value={token} />

            <AuthInput
              id="password"
              label="New Password"
              type="password"
              placeholder="Min 8 chars, uppercase, number, symbol"
              icon={<FiLock />}
              error={legacyErrors.password?.message}
              autoComplete="new-password"
              {...registerLegacy('password')}
            />

            <AuthInput
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter your new password"
              icon={<FiLock />}
              error={legacyErrors.confirmPassword?.message}
              autoComplete="new-password"
              {...registerLegacy('confirmPassword')}
            />

            <div style={{ marginTop: 'var(--space-2)' }}>
              <AuthButton type="submit" loading={legacyPending}>
                Reset Password
              </AuthButton>
            </div>
          </form>
        </motion.div>
      </AuthFormCard>
    )
  }

  // ─── Branch B: Modern 6-Digit OTP Password Reset Flow ───────────────────────
  return (
    <AuthFormCard
      title={isOtpVerified ? 'Set New Password' : 'Password Recovery'}
      subtitle={
        isOtpVerified
          ? `Create a secure new password for your account`
          : email
            ? `Enter the 6-digit recovery code sent to ${maskEmail(email)}`
            : 'Enter your email and the 6-digit recovery code sent to you'
      }
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {/* Verification / Resend Alerts */}
        {isVerifyError && verifyErrorMsg && (
          <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 16 }}>
            <FiXCircle style={{ flexShrink: 0 }} />
            <span>{verifyErrorMsg}</span>
          </div>
        )}

        {isResetError && resetErrorMsg && (
          <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 16 }}>
            <FiXCircle style={{ flexShrink: 0 }} />
            <span>{resetErrorMsg}</span>
          </div>
        )}

        {isResentSuccess && !isOtpVerified && (
          <div className="auth-alert auth-alert-success" role="status" style={{ marginBottom: 16 }}>
            <FiCheckCircle style={{ flexShrink: 0 }} />
            <span>A fresh 6-digit recovery code has been sent to your email.</span>
          </div>
        )}

        {/* STEP 1: Enter & Verify 6-Digit OTP */}
        {!isOtpVerified ? (
          <div>
            {/* Email input field if not provided in URL */}
            {!emailQuery && (
              <div style={{ marginBottom: 16 }}>
                <AuthInput
                  id="reset-email"
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  icon={<FiMail />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            )}

            {/* Expiration notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: 'var(--color-neutral-600, #64748b)',
                fontSize: '0.85rem',
                margin: '8px 0 16px',
                textAlign: 'center',
              }}
            >
              <FiClock size={14} color="#FF9900" />
              <span>
                Code valid for <strong>10 minutes</strong>. Never share your recovery code.
              </span>
            </div>

            {/* 6-Digit OTP Input Box */}
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <label
                htmlFor="otp-input-0"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-neutral-700, #334155)',
                  marginBottom: 8,
                }}
              >
                6-Digit Recovery Code
              </label>
              <OtpInput
                value={otpValue}
                onChange={setOtpValue}
                onComplete={(completedOtp) => {
                  executeVerify(completedOtp)
                }}
                disabled={isVerifyingOtp}
                error={isVerifyError}
              />
            </div>

            {/* Verify Code Button */}
            <div style={{ marginTop: 20 }}>
              <AuthButton
                id="verify-otp-btn"
                type="button"
                onClick={handleVerifyOtp}
                loading={isVerifyingOtp}
                disabled={otpValue.length !== 6 || !email.trim() || isVerifyingOtp}
              >
                {isVerifyingOtp ? 'Verifying Code…' : 'Verify 6-Digit Code'}
              </AuthButton>
            </div>

            {/* Resend Action & Cooldown Counter */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid var(--color-neutral-200, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.825rem',
              }}
            >
              <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>
                {canResend ? "Didn't receive the code?" : `Resend available in ${resendCooldown}s`}
              </span>

              <button
                type="button"
                id="resend-otp-btn"
                onClick={handleResend}
                disabled={!canResend || isResending || !email.trim()}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    canResend && email.trim()
                      ? 'var(--color-brand-accent, #FF9900)'
                      : 'var(--color-neutral-400, #94a3b8)',
                  fontWeight: 700,
                  cursor: canResend && email.trim() ? 'pointer' : 'default',
                  padding: 0,
                  fontSize: '0.85rem',
                }}
              >
                {isResending ? 'Sending…' : 'Resend Code'}
              </button>
            </div>

            {/* Back to Forgot Password / Sign In Links */}
            <div
              style={{
                marginTop: 18,
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
              }}
            >
              <Link
                to="/forgot-password"
                className="auth-link"
                style={{
                  fontSize: '0.825rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <FiArrowLeft size={13} /> Change Email
              </Link>
              <span style={{ color: 'var(--color-neutral-300, #cbd5e1)' }}>·</span>
              <Link to="/login" className="auth-link" style={{ fontSize: '0.825rem' }}>
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* STEP 2: Set & Confirm New Password */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Verified indicator badge */}
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#16a34a',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <FiCheckCircle size={18} />
              <span>Code verified for {email}. Set your new password below.</span>
            </div>

            <form onSubmit={handleNewPasswordSubmit(onNewPasswordSubmit)} noValidate>
              <input type="hidden" {...registerNewPassword('email')} value={email} />
              <input type="hidden" {...registerNewPassword('otp')} value={otpValue} />

              <AuthInput
                id="new-password"
                label="New Password"
                type="password"
                placeholder="Min 8 chars, uppercase, number, symbol"
                icon={<FiLock />}
                error={passwordErrors.password?.message}
                autoComplete="new-password"
                {...registerNewPassword('password')}
              />

              <AuthInput
                id="confirm-password"
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter your new password"
                icon={<FiLock />}
                error={passwordErrors.confirmPassword?.message}
                autoComplete="new-password"
                {...registerNewPassword('confirmPassword')}
              />

              <div style={{ marginTop: 20 }}>
                <AuthButton
                  id="submit-new-password-btn"
                  type="submit"
                  loading={isResettingPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? 'Updating Password…' : 'Update Password & Sign In'}
                </AuthButton>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>
    </AuthFormCard>
  )
}
