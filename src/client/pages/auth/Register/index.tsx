import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { FiUser, FiMail, FiLock, FiPhone, FiAtSign } from 'react-icons/fi'
import { motion } from 'framer-motion'
import AuthFormCard from '../../../../client/components/auth/AuthFormCard/index.js'
import AuthInput from '../../../../client/components/auth/AuthInput/index.js'
import AuthButton from '../../../../client/components/auth/AuthButton/index.js'
import SocialLogin from '../../../../client/components/auth/SocialLogin/index.js'
import { useRegister } from '../../../hooks/useAuth.js'
import {
  registerSchema,
  type RegisterInput,
} from '../../../../shared/validators/auth.validators.js'

const getPasswordStrength = (pwd: string) => {
  if (!pwd) return { level: 0, label: '', cls: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const map = [
    { label: '', cls: '' },
    { label: 'Weak', cls: 'strength-weak' },
    { label: 'Fair', cls: 'strength-fair' },
    { label: 'Good', cls: 'strength-good' },
    { label: 'Strong', cls: 'strength-strong' },
  ]
  return { level: score, ...map[score] }
}

export default function RegisterPage() {
  const [pwdValue, setPwdValue] = useState('')
  const { mutate: register, isPending, error, isError } = useRegister()
  const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message

  const {
    register: rhf,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) as Resolver<RegisterInput> })

  const strength = getPasswordStrength(watch('password') ?? '')

  const onSubmit = (data: RegisterInput) => register(data)

  return (
    <AuthFormCard title="Create Account" wide>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {isError && errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Name Row */}
          <div className="auth-grid-2">
            <AuthInput
              id="firstName"
              label="First Name"
              placeholder="John"
              icon={<FiUser />}
              error={errors.firstName?.message}
              autoComplete="given-name"
              {...rhf('firstName')}
            />
            <AuthInput
              id="lastName"
              label="Last Name"
              placeholder="Doe"
              icon={<FiUser />}
              error={errors.lastName?.message}
              autoComplete="family-name"
              {...rhf('lastName')}
            />
          </div>

          <AuthInput
            id="username"
            label="Username"
            placeholder="johndoe_123"
            icon={<FiAtSign />}
            error={errors.username?.message}
            hint="Lowercase letters, numbers, and underscores only"
            autoComplete="username"
            {...rhf('username')}
          />

          <AuthInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={<FiMail />}
            error={errors.email?.message}
            autoComplete="email"
            {...rhf('email')}
          />

          <AuthInput
            id="phoneNumber"
            label="Phone Number (optional)"
            type="tel"
            placeholder="+1 234 567 8900"
            icon={<FiPhone />}
            error={errors.phoneNumber?.message}
            autoComplete="tel"
            {...rhf('phoneNumber')}
          />

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <FiLock />
              </span>
              <input
                id="password"
                type="password"
                className={`auth-input ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Min 8 chars, uppercase, number, symbol"
                autoComplete="new-password"
                {...rhf('password')}
                onChange={(e) => {
                  rhf('password').onChange(e)
                  setPwdValue(e.target.value)
                }}
              />
            </div>
            {pwdValue && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${strength.cls}`} />
                </div>
                <span className="password-strength-label">Strength: {strength.label}</span>
              </div>
            )}
            {errors.password && <span className="auth-error-msg">{errors.password.message}</span>}
          </div>

          {/* Account Type */}
          <div className="auth-input-group">
            <label className="auth-label" htmlFor="role">
              Account Type
            </label>
            <select
              id="role"
              className="auth-input no-icon"
              {...rhf('role')}
              style={{ height: 40, cursor: 'pointer' }}
            >
              <option value="user">Buyer — Shop products</option>
              <option value="seller">Seller — List and sell products</option>
            </select>
          </div>

          <div style={{ marginTop: 'var(--space-2)' }}>
            <AuthButton type="submit" loading={isPending}>
              Create Account
            </AuthButton>
          </div>
        </form>

        <SocialLogin />

        <p className="auth-terms">
          By creating an account, you agree to Cartiva&apos;s <a href="#">Conditions of Use</a> and{' '}
          <a href="#">Privacy Notice</a>.
        </p>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </motion.div>
    </AuthFormCard>
  )
}
