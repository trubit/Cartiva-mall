import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CgSpinner } from 'react-icons/cg'

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

export default function AuthButton({
  loading = false,
  variant = 'primary',
  children,
  disabled,
  ...rest
}: AuthButtonProps) {
  return (
    <button className={`auth-btn auth-btn-${variant}`} disabled={disabled || loading} {...rest}>
      {loading ? (
        <>
          <CgSpinner className="animate-spin" size={18} />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
