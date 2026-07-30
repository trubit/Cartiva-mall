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
      { label: 'Sell on Cartiva', to: '/register' },
      { label: 'Become an Affiliate', to: '/affiliate' },
      { label: 'Advertise Your Products', to: '/advertise' },
    ],
  },
  {
    title: 'Payment Products',
    links: [
      { label: 'Secure Payment', to: '/payment' },
      { label: 'Business Card', to: '/business-card' },
      { label: 'Reload Balance', to: '/reload' },
      { label: 'Gift Cards', to: '/gift-cards' },
    ],
  },
  {
    title: 'Let Us Help You',
    links: [
      { label: 'Your Account', to: '/profile' },
      { label: 'Your Orders', to: '/orders' },
      { label: 'Shipping Rates', to: '/shipping' },
      { label: 'Returns & Replacements', to: '/returns' },
      { label: 'Help', to: '/help' },
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
                      <Link to={l.to} className="amz-footer__link">
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
            <Link to="/" className="amz-footer__logo">
              <Logo size="sm" theme="dark" />
            </Link>
            <div className="amz-footer__bottom-links">
              <a href="#" className="amz-footer__bottom-link">
                Conditions of Use
              </a>
              <a href="#" className="amz-footer__bottom-link">
                Privacy Notice
              </a>
              <a href="#" className="amz-footer__bottom-link">
                Your Ads Privacy Choices
              </a>
            </div>
          </div>
          <p className="amz-footer__copy">&copy; {year}, Cartiva, Inc. or its affiliates</p>
        </div>
      </div>
    </footer>
  )
}
