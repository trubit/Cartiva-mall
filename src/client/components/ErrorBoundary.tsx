import { Component, type ErrorInfo, type ReactNode } from 'react'
import Logo from './ui/Logo/index.js'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      '[GlobalErrorBoundary] Unhandled application error:',
      error.message,
      info.componentStack,
    )
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHardReset = () => {
    try {
      window.sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDev = Boolean(import.meta.env.DEV)

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: '#0b1120',
            color: '#f8fafc',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '32px' }}>
            <Logo size="lg" theme="dark" />
          </div>

          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '48px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              Something unexpected occurred
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: '#94a3b8',
                lineHeight: 1.6,
                margin: '0 0 32px',
              }}
            >
              Cartival Mall experienced a temporary connection or display interruption. Your
              account, bag, and orders are completely secure.
            </p>

            {isDev && this.state.error && (
              <details
                style={{
                  marginBottom: '28px',
                  textAlign: 'left',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#f87171',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                  Developer Diagnostics (Development Only)
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
                  padding: '12px 28px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
                }}
              >
                Reload Marketplace
              </button>

              <button
                onClick={this.handleHardReset}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Return to Home
              </button>
            </div>
          </div>

          <p
            style={{
              marginTop: '32px',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            &copy; {new Date().getFullYear()} Cartival Mall, Inc. &middot; All rights reserved.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
