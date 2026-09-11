import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { FiMail, FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import AuthButton from '../../../../client/components/auth/AuthButton/index.js'
import SocialLogin from '../../../../client/components/auth/SocialLogin/index.js'
import { useLogin, useResendVerification } from '../../../hooks/useAuth.js'
import { loginSchema, type LoginInput } from '../../../../shared/validators/auth.validators.js'

export default function LoginPage() {
  const [params] = useSearchParams()
  const registered = params.get('registered') === 'true'
  const reset = params.get('reset') === 'true'

  const { mutate: login, isPending, error, isError } = useLogin()
  const { mutate: resend, isPending: resending, isSuccess: resent } = useResendVerification()

  const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message
  const isUnverified = isError && !!errorMsg?.toLowerCase().includes('not verified')

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginInput) => login(data)

  const handleResend = () => {
    const email = getValues('email')
    if (email) resend(email)
  }

  return (
    <AuthFormCard title="Sign In" subtitle="Welcome back to Cartiva">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {registered && (
          <div className="auth-alert auth-alert-success">
            Account created! Please check your email to verify your account.
          </div>
        )}
        {reset && (
          <div className="auth-alert auth-alert-success">
            Password reset successfully. Please sign in.
          </div>
        )}

        {isError && !isUnverified && errorMsg && (
          <div className="auth-alert auth-alert-error">{errorMsg}</div>
        )}

        {isUnverified && (
          <div
            className="auth-alert auth-alert-error"
            style={{ flexDirection: 'column', gap: 'var(--space-3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
              <FiAlertCircle style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{errorMsg}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                to={`/verify-email?email=${encodeURIComponent(getValues('email') || '')}`}
                className="auth-btn auth-btn-primary"
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '6px 14px',
                  height: 'auto',
                  textDecoration: 'none',
                }}
              >
                Enter 6-Digit Code
              </Link>
              {resent ? (
                <span style={{ fontSize: 'var(--text-xs)', color: '#065f46', fontWeight: 600 }}>
                  <FiCheckCircle /> Code resent!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#991b1b',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@gmail.com"
            icon={<FiMail />}
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />

          <AuthInput
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            icon={<FiLock />}
            error={errors.password?.message}
            autoComplete="current-password"
            {...register('password')}
          />

          <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: 'var(--space-4)' }}>
            <Link
              to="/forgot-password"
              className="auth-link"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              Forgot password?
            </Link>
          </div>

          <AuthButton type="submit" loading={isPending}>
            Sign In
          </AuthButton>
        </form>

        <SocialLogin />

        <p className="auth-terms">
          By signing in, you agree to Cartiva&apos;s{' '}
          <Link to="/conditions" className="auth-link" style={{ fontWeight: 600 }}>
            Conditions of Use
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="auth-link" style={{ fontWeight: 600 }}>
            Privacy Notice
          </Link>
          .
        </p>

        <div className="auth-divider">New to Cartiva?</div>

        <Link to="/register">
          <button type="button" className="auth-btn auth-btn-secondary">
            Create your account
          </button>
        </Link>
      </motion.div>
    </AuthFormCard>
  )
}
