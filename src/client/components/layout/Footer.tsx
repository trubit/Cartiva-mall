import { Link } from 'react-router-dom'
import Logo from '../ui/Logo/index.js'

const FOOTER_COLS = [
  {
    title: 'Get to Know Us',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Press Releases', to: '/press' },
      { label: 'Investor Relations', to: '/investors' },
    ],
  },
  {
    title: 'Make Money with Us',
    links: [
      { label: 'Sell Products Online', to: '/register' },
      { label: 'Sell on Cartival Mall', to: '/seller/onboarding' },
      { label: 'Advertise Your Products', to: '/advertise' },
    ],
  },
  {
    title: 'Payment & Security',
    links: [
      { label: 'Secure Payment', to: '/payment' },
      { label: 'Shipping Rates & Transit', to: '/shipping' },
      { label: 'Returns & Replacements', to: '/returns' },
    ],
  },
  {
    title: 'Let Us Help You',
    links: [
      { label: 'Your Account', to: '/profile' },
      { label: 'Your Orders', to: '/orders' },
      { label: 'Help & Support Center', to: '/help' },
    ],
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer className="amz-footer">
      {/* Back to top */}
      <button className="amz-footer__top-btn" onClick={scrollToTop} aria-label="Back to top">
        Back to top
      </button>

      {/* Main columns */}
      <div className="amz-footer__main">
        <div className="container">
          <div className="amz-footer__grid">
            {FOOTER_COLS.map((col) => (
              <div key={col.title} className="amz-footer__col">
                <h4 className="amz-footer__col-title">{col.title}</h4>
                <ul className="amz-footer__col-list">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="amz-footer__link" onClick={scrollToTop}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="amz-footer__divider" />

      {/* Logo + bottom */}
      <div className="amz-footer__bottom">
        <div className="container">
          <div className="amz-footer__bottom-inner">
            <Link to="/" className="amz-footer__logo" onClick={scrollToTop}>
              <Logo size="sm" theme="dark" />
            </Link>
            <div className="amz-footer__bottom-links">
              <Link to="/conditions" className="amz-footer__bottom-link" onClick={scrollToTop}>
                Conditions of Use
              </Link>
              <Link to="/privacy" className="amz-footer__bottom-link" onClick={scrollToTop}>
                Privacy Notice
              </Link>
              <Link to="/privacy-choices" className="amz-footer__bottom-link" onClick={scrollToTop}>
                Your Ads Privacy Choices
              </Link>
            </div>
          </div>
          <p className="amz-footer__copy">&copy; {year}, Cartival Mall, Inc. or its affiliates</p>
        </div>
      </div>
    </footer>
  )
}
