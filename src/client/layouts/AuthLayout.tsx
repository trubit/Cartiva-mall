import { Outlet, Link } from 'react-router-dom'
import Logo from '../components/ui/Logo/index.js'

export default function AuthLayout() {
  return (
    <div
      className="flex-center"
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <Link
            to="/"
            style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}
          >
            <Logo size="lg" theme="light" />
          </Link>
        </div>
        <div className="card">
          <div className="card-body">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
