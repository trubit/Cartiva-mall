import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams, Link } from 'react-router-dom'
import { FiLock, FiAlertTriangle } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import AuthButton from '../../../../client/components/auth/AuthButton/index.js'
import { useResetPassword } from '../../../hooks/useAuth.js'
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '../../../../shared/validators/auth.validators.js'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const { mutate: reset, isPending, error, isError } = useResetPassword()
  const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  })

  const onSubmit = (data: ResetPasswordInput) => reset(data)

  if (!token) {
    return (
      <AuthFormCard title="Invalid Link">
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <FiAlertTriangle
            size={48}
            color="var(--color-warning)"
            style={{ marginBottom: 'var(--space-4)' }}
          />
          <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="auth-btn auth-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: 42,
              textDecoration: 'none',
            }}
          >
            Request New Link
          </Link>
        </div>
      </AuthFormCard>
    )
  }

  return (
    <AuthFormCard title="Reset Password" subtitle="Enter your new password below">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {isError && errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <input type="hidden" {...register('token')} value={token} />

          <AuthInput
            id="password"
            label="New Password"
            type="password"
            placeholder="Min 8 chars, uppercase, number, symbol"
            icon={<FiLock />}
            error={errors.password?.message}
            autoComplete="new-password"
            {...register('password')}
          />

          <AuthInput
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter your new password"
            icon={<FiLock />}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />

          <div style={{ marginTop: 'var(--space-2)' }}>
            <AuthButton type="submit" loading={isPending}>
              Reset Password
            </AuthButton>
          </div>
        </form>
      </motion.div>
    </AuthFormCard>
  )
}
