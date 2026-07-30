import { useState, forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: ReactNode
  hint?: string
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, hint, type = 'text', id, ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="auth-input-group">
        <label className="auth-label" htmlFor={id}>
          {label}
        </label>
        <div className="auth-input-wrapper">
          {icon && <span className="auth-input-icon">{icon}</span>}
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={`auth-input ${!icon ? 'no-icon' : ''} ${error ? 'is-invalid' : ''}`}
            style={isPassword ? { paddingRight: '2.5rem' } : undefined}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          )}
        </div>
        {error && (
          <span id={`${id}-error`} className="auth-error-msg" role="alert">
            <FiAlertCircle size={13} />
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
            {hint}
          </span>
        )}
      </div>
    )
  },
)

AuthInput.displayName = 'AuthInput'
export default AuthInput
