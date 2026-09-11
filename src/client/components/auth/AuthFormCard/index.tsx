import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../ui/Logo/index.js'

interface AuthFormCardProps {
  title: string
  subtitle?: string
  wide?: boolean
  children: ReactNode
}

export default function AuthFormCard({ title, subtitle, wide, children }: AuthFormCardProps) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-header-logo">
          <Logo size="md" theme="dark" />
        </Link>
      </header>

      <main className="auth-body">
        <div className={`auth-card ${wide ? 'auth-card-wide' : ''} animate-fade-in-up`}>
          <h1 className="auth-card-title">{title}</h1>
          {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
          {children}
        </div>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: 'var(--space-6)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-neutral-400)',
        }}
      >
        &copy; {new Date().getFullYear()} Cartiva &nbsp;|&nbsp;
        <Link to="/privacy" className="auth-link">
          Privacy Notice
        </Link>{' '}
        &nbsp;|&nbsp;
        <Link to="/conditions" className="auth-link">
          Conditions of Use
        </Link>{' '}
        &nbsp;|&nbsp;
        <Link to="/help" className="auth-link">
          Help
        </Link>
      </footer>
    </div>
  )
}
