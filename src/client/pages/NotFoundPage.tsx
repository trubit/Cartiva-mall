import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div
      className="flex-center"
      style={{
        minHeight: '80vh',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 'var(--text-5xl)', color: 'var(--color-neutral-300)' }}>404</h1>
      <h2>Page Not Found</h2>
      <p style={{ color: 'var(--color-neutral-500)' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="btn btn-primary btn-lg">
        Go Home
      </Link>
    </div>
  )
}
