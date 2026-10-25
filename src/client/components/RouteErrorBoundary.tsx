import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiRefreshCw, FiHome, FiHelpCircle } from 'react-icons/fi'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log error internally for monitoring without exposing sensitive details to the DOM
    console.error(
      '[RouteErrorBoundary] Caught route rendering failure:',
      error.message,
      info.componentStack,
    )
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env.DEV)

      return (
        <div
          role="alert"
          style={{
            maxWidth: '680px',
            margin: '60px auto',
            padding: '40px 32px',
            background: 'var(--color-bg-surface, #ffffff)',
            borderRadius: '20px',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            color: 'var(--color-text-primary, #0f172a)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '28px',
            }}
          >
            <FiAlertTriangle />
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              margin: '0 0 12px',
              color: 'var(--color-text-primary, #0f172a)',
            }}
          >
            {this.props.fallbackTitle ?? 'Unable to display this page'}
          </h2>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--color-text-muted, #64748b)',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto 28px',
            }}
          >
            We encountered a temporary loading issue while preparing this section. Your account,
            bag, and orders remain safe.
          </p>

          {isDev && this.state.error && (
            <details
              style={{
                marginBottom: '28px',
                textAlign: 'left',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#334155',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#dc2626' }}>
                Developer Diagnostics (Hidden in Production)
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '12px',
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '10px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
              }}
            >
              <FiRefreshCw /> Reload Page
            </button>

            <button
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>

            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '10px',
                background: 'transparent',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              <FiHome /> Marketplace Home
            </Link>

            <Link
              to="/help"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '10px',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid transparent',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              <FiHelpCircle /> Help Center
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default RouteErrorBoundary
