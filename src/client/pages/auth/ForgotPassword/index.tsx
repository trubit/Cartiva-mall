import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import AuthButton from '../../../../client/components/auth/AuthButton/index.js'
import { useForgotPassword } from '../../../hooks/useAuth.js'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '../../../../shared/validators/auth.validators.js'

export default function ForgotPasswordPage() {
  const { mutate: forgot, isPending, isSuccess, error, isError } = useForgotPassword()
  const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = (data: ForgotPasswordInput) => forgot(data.email)

  if (isSuccess) {
    return (
      <AuthFormCard title="Check your email">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}
        >
          <div
            className="auth-verify-icon auth-verify-success"
            style={{ margin: '0 auto var(--space-4)' }}
          >
            <FiCheckCircle size={36} color="var(--color-success)" />
          </div>
          <p
            style={{
              color: 'var(--color-neutral-600)',
              marginBottom: 'var(--space-6)',
              lineHeight: 1.7,
            }}
          >
            If that email address is registered, we&apos;ve sent a password reset link. Please check
            your inbox and spam folder.
          </p>
          <Link
            to="/login"
            className="auth-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FiArrowLeft size={14} /> Back to Sign In
          </Link>
        </motion.div>
      </AuthFormCard>
    )
  }

  return (
    <AuthFormCard title="Forgot Password" subtitle="Enter your email and we'll send a reset link">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {isError && errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={<FiMail />}
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />
          <div style={{ marginTop: 'var(--space-2)' }}>
            <AuthButton type="submit" loading={isPending}>
              Send Reset Link
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
