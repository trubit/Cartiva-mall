import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiShield, FiCheck, FiLock } from 'react-icons/fi'
import Logo from '../../ui/Logo/index.js'
import type { HumanImageAsset } from '../../../constants/images.js'

export interface AuthShowcaseProps {
  image: HumanImageAsset
  tag?: string
  headline?: string
  trustText?: string
  quote?: string
  author?: string
  role?: string
}

interface AuthFormCardProps {
  title: string
  subtitle?: string
  wide?: boolean
  showcase?: AuthShowcaseProps
  children: ReactNode
}

export default function AuthFormCard({
  title,
  subtitle,
  wide,
  showcase,
  children,
}: AuthFormCardProps) {
  const formCard = (
    <div className={`auth-card ${wide ? 'auth-card-wide' : ''} animate-fade-in-up`}>
      <h1 className="auth-card-title">{title}</h1>
      {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
      {children}
    </div>
  )

  return (
    <div className={`auth-page ${showcase ? 'auth-page--photographic' : ''}`}>
      {/* Full-bleed background photograph layer */}
      {showcase && (
        <div className="auth-bg-layer" aria-hidden="true">
          <img
            src={showcase.image.url}
            srcSet={`${showcase.image.url.replace('&w=1920', '&w=640')} 640w, ${showcase.image.url.replace('&w=1920', '&w=1024')} 1024w, ${showcase.image.url.replace('&w=1920', '&w=1440')} 1440w, ${showcase.image.url} 1920w`}
            sizes="100vw"
            alt=""
            className="auth-bg-img"
            loading="eager"
            fetchPriority="high"
            width={showcase.image.width}
            height={showcase.image.height}
          />
          <div className="auth-bg-overlay" />
        </div>
      )}

      <header className="auth-header">
        <Link to="/" className="auth-header-logo" aria-label="Cartiva Mall Home">
          <Logo size="md" theme="dark" />
        </Link>
      </header>

      <main className="auth-body">
        {showcase ? (
          <div className="auth-photographic-container">
            <div className="auth-photographic-grid">
              <div className="auth-form-column">{formCard}</div>

              <div className="auth-welcome-column">
                <div className="auth-welcome-badge">
                  <FiShield className="auth-welcome-badge-icon" />
                  <span>Trusted &middot; Fast &middot; Secure</span>
                </div>
                {showcase.headline && (
                  <h2 className="auth-welcome-headline">{showcase.headline}</h2>
                )}
                {showcase.tag && <p className="auth-welcome-tagline">{showcase.tag}</p>}
                <div className="auth-welcome-trust">
                  <span className="auth-welcome-trust-item">
                    <FiCheck className="auth-trust-icon" /> Buyer Escrow Guarantee
                  </span>
                  <span className="auth-welcome-trust-item">
                    <FiCheck className="auth-trust-icon" /> 100% Verified Sellers
                  </span>
                  <span className="auth-welcome-trust-item">
                    <FiLock className="auth-trust-icon" /> PCI-DSS Encrypted Payments
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="auth-form-column">{formCard}</div>
        )}
      </main>

      <footer className="auth-footer">
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
