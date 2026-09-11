import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft, FiLock, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import AuthButton from '../../../../client/components/auth/AuthButton/index.js'
import OtpInput from '../../../../client/components/auth/OtpInput/index.js'
import { useForgotPassword, useResetPasswordWithOtp, useResendOtp } from '../../../hooks/useAuth.js'
import {
  forgotPasswordSchema,
  resetPasswordOtpSchema,
  type ForgotPasswordInput,
  type ResetPasswordOtpInput,
} from '../../../../shared/validators/auth.validators.js'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [emailSubmitted, setEmailSubmitted] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [resendCooldown, setResendCooldown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Request OTP hook
  const {
    mutate: requestResetOtp,
    isPending: requestingOtp,
    isError: requestError,
    error: requestErrObj,
  } = useForgotPassword()

  // Reset password hook
  const {
    mutate: resetPasswordWithOtp,
    isPending: resettingPassword,
    isError: resetError,
    error: resetErrObj,
  } = useResetPasswordWithOtp()

  // Resend hook
  const { mutate: resendOtp, isPending: resending, isSuccess: resentSuccess } = useResendOtp()

  const requestErrorMsg = (requestErrObj as { response?: { data?: { message?: string } } })
    ?.response?.data?.message
  const resetErrorMsg = (resetErrObj as { response?: { data?: { message?: string } } })?.response
    ?.data?.message

  // Form for Step 1 (Email)
  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  // Form for Step 2 (New Password)
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    setValue: setPasswordFormValue,
    formState: { errors: passwordErrors },
  } = useForm<ResetPasswordOtpInput>({
    resolver: zodResolver(resetPasswordOtpSchema),
  })

  // 60s cooldown timer
  useEffect(() => {
    if (step === 'otp' && resendCooldown > 0) {
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
  }, [step, resendCooldown])

  const onEmailSubmit = (data: ForgotPasswordInput) => {
    const cleanEmail = data.email.trim()
    setEmailSubmitted(cleanEmail)
    requestResetOtp(cleanEmail, {
      onSuccess: () => {
        setPasswordFormValue('email', cleanEmail)
        setStep('otp')
        setResendCooldown(60)
        setCanResend(false)
      },
    })
  }

  const onOtpSubmit = (data: ResetPasswordOtpInput) => {
    resetPasswordWithOtp({
      ...data,
      email: emailSubmitted,
      otp: otpValue,
    })
  }

  const handleResend = () => {
    if (!emailSubmitted || !canResend) return
    resendOtp(
      { email: emailSubmitted, purpose: 'PASSWORD_RESET' },
      {
        onSuccess: () => {
          setResendCooldown(60)
          setCanResend(false)
          setOtpValue('')
        },
      },
    )
  }

  // ─── Step 1: Enter Email ──────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <AuthFormCard
        title="Reset Password"
        subtitle="Enter your email to receive a 6-digit recovery code"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {requestError && requestErrorMsg && (
            <div className="auth-alert auth-alert-error">{requestErrorMsg}</div>
          )}

          <form onSubmit={handleEmailSubmit(onEmailSubmit)} noValidate>
            <AuthInput
              id="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              icon={<FiMail />}
              error={emailErrors.email?.message}
              autoComplete="email"
              {...registerEmail('email')}
            />

            <div style={{ marginTop: 'var(--space-2)' }}>
              <AuthButton type="submit" loading={requestingOtp}>
                Send 6-Digit Code
              </AuthButton>
            </div>
          </form>

          <div className="auth-footer" style={{ marginTop: 'var(--space-5)' }}>
            <Link
              to="/login"
              className="auth-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FiArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </motion.div>
      </AuthFormCard>
    )
  }

  // ─── Step 2: Enter OTP + New Password ─────────────────────────────────────────
  return (
    <AuthFormCard
      title="Set New Password"
      subtitle={`Enter the 6-digit code sent to ${emailSubmitted}`}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {resetError && resetErrorMsg && (
          <div className="auth-alert auth-alert-error" style={{ marginBottom: '16px' }}>
            <FiXCircle /> {resetErrorMsg}
          </div>
        )}

        {resentSuccess && (
          <div className="auth-alert auth-alert-success" style={{ marginBottom: '16px' }}>
            <FiCheckCircle /> A fresh 6-digit recovery code has been sent.
          </div>
        )}

        <form onSubmit={handlePasswordSubmit(onOtpSubmit)} noValidate>
          <input type="hidden" {...registerPassword('email')} value={emailSubmitted} />
          <input type="hidden" {...registerPassword('otp')} value={otpValue} />

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-neutral-700)',
                marginBottom: '4px',
              }}
            >
              6-Digit Recovery Code
            </label>
            <OtpInput
              value={otpValue}
              onChange={(val) => {
                setOtpValue(val)
                setPasswordFormValue('otp', val)
              }}
              disabled={resettingPassword}
              error={!!passwordErrors.otp}
            />
            {passwordErrors.otp && (
              <p
                style={{
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-xs)',
                  marginTop: '4px',
                }}
              >
                {passwordErrors.otp.message}
              </p>
            )}
          </div>

          <AuthInput
            id="password"
            label="New Password"
            type="password"
            placeholder="Min 8 chars, uppercase, number, symbol"
            icon={<FiLock />}
            error={passwordErrors.password?.message}
            autoComplete="new-password"
            {...registerPassword('password')}
          />

          <AuthInput
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter your new password"
            icon={<FiLock />}
            error={passwordErrors.confirmPassword?.message}
            autoComplete="new-password"
            {...registerPassword('confirmPassword')}
          />

          <div style={{ marginTop: 'var(--space-2)' }}>
            <AuthButton type="submit" loading={resettingPassword} disabled={otpValue.length !== 6}>
              Update Password & Sign In
            </AuthButton>
          </div>
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
            disabled={!canResend || resending}
            style={{
              background: 'none',
              border: 'none',
              color: canResend ? 'var(--color-brand-accent, #FF9900)' : 'var(--color-neutral-400)',
              fontWeight: 700,
              cursor: canResend ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            {resending ? 'Sending…' : 'Resend Code'}
          </button>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtpValue('')
            }}
            className="auth-link"
            style={{
              fontSize: 'var(--text-xs)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ← Change email address
          </button>
        </div>
      </motion.div>
    </AuthFormCard>
  )
}
