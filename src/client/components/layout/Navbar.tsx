import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiSearch,
  FiShoppingCart,
  FiChevronDown,
  FiMenu,
  FiX,
  FiUser,
  FiPackage,
  FiLogOut,
  FiSettings,
  FiGlobe,
  FiCheck,
  FiGrid,
  FiHeart,
  FiShoppingBag,
  FiMessageSquare,
} from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore.js'
import { useCartStore } from '../../store/cartStore.js'
import { useLanguageStore, LANGUAGES } from '../../store/languageStore.js'
import { useT } from '../../i18n/useT.js'
import { PRODUCT_CATEGORIES, ROLES } from '../../../shared/constants/index.js'
import Logo from '../ui/Logo/index.js'
import { useLogout } from '../../hooks/useAuth.js'
import NotificationBell from './NotificationBell/index.js'
import { useUnreadMessagesCount } from '../../hooks/useMessaging.js'
import CurrencySelector from '../common/CurrencySelector/index.js'

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: '💻',
  'Clothing & Fashion': '👗',
  'Home & Garden': '🏡',
  'Sports & Outdoors': '⚽',
  'Books & Media': '📚',
  'Health & Beauty': '💄',
  'Toys & Games': '🎮',
  Automotive: '🚗',
  'Food & Grocery': '🛒',
  'Jewelry & Accessories': '💍',
}

function UserAvatar({ src, name, size = 28 }: { src?: string; name?: string; size?: number }) {
  const [imgErr, setImgErr] = useState(false)
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={name ?? 'avatar'}
        onError={() => setImgErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(255,153,0,.7)',
          flexShrink: 0,
          display: 'block',
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#f0c14b,#FF9900)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        color: '#0F1111',
        border: '2px solid rgba(255,153,0,.7)',
        flexShrink: 0,
        letterSpacing: '0.5px',
      }}
    >
      {initials}
    </div>
  )
}

export default function Navbar() {
  const { isAuthenticated, user } = useAuthStore()
  const totalItems = useCartStore((s) => s.totalItems())
  const { currentLang, setLanguage, getLang } = useLanguageStore()
  const t = useT()
  const navigate = useNavigate()
  const logoutMutation = useLogout()
  const unreadMsgsQuery = useUnreadMessagesCount()
  const unreadMsgCount = unreadMsgsQuery.data?.unreadConversations ?? 0

  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [searchCategory, setSearchCategory] = useState('All')
  const [scrolled, setScrolled] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    setAccountMenuOpen(false)
    logoutMutation.mutate()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const currentLangObj = getLang()
  const fullName = user ? `${user.firstName} ${user.lastName}` : ''

  return (
    <>
      <header className={`amz-header${scrolled ? ' amz-header--scrolled' : ''}`}>
        {/* ── Top Bar ──────────────────────────────────── */}
        <div className="amz-header__top">
          <div className="amz-header__inner">
            {/* Logo */}
            <Link to="/" className="amz-logo">
              <Logo size="md" theme="dark" />
            </Link>

            {/* Deliver to */}
            <Link to="/profile" className="amz-deliver hide-mobile">
              <span className="amz-deliver__label">{t.nav_deliver_to}</span>
              <span className="amz-deliver__location">
                {isAuthenticated ? user?.firstName : 'Select location'}
              </span>
            </Link>

            {/* Search Bar */}
            <form className="amz-search" onSubmit={handleSearch}>
              <select
                className="amz-search__category hide-mobile"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                aria-label="Search category"
              >
                <option>All</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                className="amz-search__input"
                type="text"
                placeholder={t.nav_search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
              <button className="amz-search__btn" type="submit" aria-label="Search">
                <FiSearch size={20} />
              </button>
            </form>

            {/* Right side actions */}
            <div className="amz-header__actions">
              {/* ── Language Switcher ── */}
              <div className="amz-lang hide-mobile" ref={langRef} style={{ position: 'relative' }}>
                <button
                  className="amz-action-link__btn amz-lang__btn"
                  onClick={() => setLangMenuOpen((o) => !o)}
                  aria-label="Change language"
                  aria-expanded={langMenuOpen}
                >
                  <span className="amz-lang__flag">{currentLangObj.flag}</span>
                  <span className="amz-lang__code">{currentLang.toUpperCase()}</span>
                  <FiChevronDown size={11} style={{ opacity: 0.7 }} />
                </button>

                {langMenuOpen && (
                  <div className="amz-lang__dropdown" role="menu">
                    <div className="amz-lang__dropdown-title">
                      <FiGlobe size={14} />
                      {t.nav_language}
                    </div>
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        className={`amz-lang__option${lang.code === currentLang ? ' amz-lang__option--active' : ''}`}
                        onClick={() => {
                          setLanguage(lang.code)
                          setLangMenuOpen(false)
                        }}
                        role="menuitem"
                      >
                        <span className="amz-lang__opt-flag">{lang.flag}</span>
                        <span className="amz-lang__opt-info">
                          <span className="amz-lang__opt-native">{lang.nativeName}</span>
                          <span className="amz-lang__opt-en">{lang.name}</span>
                        </span>
                        {lang.code === currentLang && (
                          <FiCheck size={13} style={{ marginLeft: 'auto', color: '#FF9900' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Currency Switcher ── */}
              <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center' }}>
                <CurrencySelector />
              </div>

              {/* ── Account ── */}
              <div className="amz-action-link" ref={accountRef} style={{ position: 'relative' }}>
                <button
                  className="amz-action-link__btn amz-account-btn"
                  onClick={() => setAccountMenuOpen((o) => !o)}
                  aria-expanded={accountMenuOpen}
                >
                  {isAuthenticated && (
                    <UserAvatar src={user?.profileImage} name={fullName} size={30} />
                  )}
                  <div className="amz-account-btn__text">
                    <span className="amz-action-link__top">
                      {isAuthenticated
                        ? `${t.nav_hello}, ${user?.firstName}`
                        : `${t.nav_hello}, ${t.nav_signin}`}
                    </span>
                    <span className="amz-action-link__bottom">
                      {t.nav_account} <FiChevronDown size={11} />
                    </span>
                  </div>
                </button>

                {/* Account dropdown */}
                {accountMenuOpen && (
                  <div className="amz-account-dropdown">
                    {isAuthenticated && (
                      <div className="amz-account-dropdown__user-card">
                        <UserAvatar src={user?.profileImage} name={fullName} size={44} />
                        <div className="amz-account-dropdown__user-info">
                          <span className="amz-account-dropdown__user-name">{fullName}</span>
                          <span className="amz-account-dropdown__user-email">{user?.email}</span>
                          <span className={`amz-account-dropdown__user-role role-${user?.role}`}>
                            {user?.role === 'seller'
                              ? 'Seller'
                              : user?.role === 'admin'
                                ? 'Admin'
                                : 'Buyer'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!isAuthenticated ? (
                      <>
                        <Link
                          to="/login"
                          className="amz-account-dropdown__sign-in-btn"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          {t.acc_sign_in}
                        </Link>
                        <p className="amz-account-dropdown__new">
                          {t.acc_new_customer}{' '}
                          <Link to="/register" onClick={() => setAccountMenuOpen(false)}>
                            {t.acc_start_here}
                          </Link>
                        </p>
                        <div className="amz-account-dropdown__divider" />
                      </>
                    ) : null}

                    <div className="amz-account-dropdown__cols">
                      <div>
                        <p className="amz-account-dropdown__col-title">{t.acc_your_account}</p>
                        {isAuthenticated ? (
                          <>
                            {user?.role === ROLES.SELLER ? (
                              <Link
                                to="/seller"
                                className="amz-account-dropdown__link"
                                onClick={() => setAccountMenuOpen(false)}
                                style={{
                                  fontWeight: 600,
                                  color: 'var(--color-brand-accent, #FF9900)',
                                }}
                              >
                                <FiGrid size={13} /> Seller Hub
                              </Link>
                            ) : null}
                            <Link
                              to="/dashboard"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <FiGrid size={13} /> Buyer Dashboard
                            </Link>
                            <Link
                              to="/dashboard/wishlist"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <FiHeart size={13} /> Wishlist
                            </Link>
                            <Link
                              to="/profile"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <FiUser size={13} /> {t.acc_profile}
                            </Link>
                            <Link
                              to="/orders"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <FiPackage size={13} /> {t.acc_orders}
                            </Link>
                            <Link
                              to="/messages"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <FiMessageSquare size={13} /> Messages
                              {unreadMsgCount > 0 && (
                                <span
                                  style={{
                                    marginLeft: 'auto',
                                    background: '#FF9900',
                                    color: '#0f172a',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 10,
                                  }}
                                >
                                  {unreadMsgCount}
                                </span>
                              )}
                            </Link>
                            {user?.role === ROLES.ADMIN && (
                              <Link
                                to="/admin"
                                className="amz-account-dropdown__link"
                                onClick={() => setAccountMenuOpen(false)}
                              >
                                <FiSettings size={13} /> {t.acc_admin}
                              </Link>
                            )}
                            {(user?.role === ROLES.SELLER || user?.role === ROLES.ADMIN) && (
                              <Link
                                to="/dashboard"
                                className="amz-account-dropdown__link"
                                onClick={() => setAccountMenuOpen(false)}
                              >
                                <FiShoppingBag size={13} /> Buyer View
                              </Link>
                            )}
                            <button
                              className="amz-account-dropdown__link amz-account-dropdown__link--logout"
                              onClick={handleLogout}
                            >
                              <FiLogOut size={13} /> {t.acc_sign_out}
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/login"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              {t.acc_sign_in}
                            </Link>
                            <Link
                              to="/register"
                              className="amz-account-dropdown__link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              {t.acc_register}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Orders */}
              <Link
                to="/orders"
                className="amz-action-link hide-mobile"
                style={{ textDecoration: 'none' }}
              >
                <span className="amz-action-link__top">{t.nav_returns}</span>
                <span className="amz-action-link__bottom">{t.nav_orders}</span>
              </Link>

              {/* Messages */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="amz-action-link__btn hide-mobile"
                  aria-label={`Messages${unreadMsgCount > 0 ? ` (${unreadMsgCount} unread)` : ''}`}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '0 6px',
                  }}
                >
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <FiMessageSquare size={21} />
                    {unreadMsgCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: '#FF9900',
                          color: '#0f172a',
                          fontSize: 10,
                          fontWeight: 800,
                          borderRadius: '50%',
                          minWidth: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 3px',
                        }}
                      >
                        {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                      </span>
                    )}
                  </span>
                </Link>
              )}

              {/* Notifications */}
              {isAuthenticated && <NotificationBell />}

              {/* Cart */}
              <Link to="/cart" className="amz-cart-link">
                <span className="amz-cart-link__icon">
                  <FiShoppingCart size={28} />
                  {totalItems > 0 && (
                    <span className="amz-cart-link__count">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </span>
                <span className="amz-cart-link__text hide-mobile">{t.nav_cart}</span>
              </Link>

              {/* Mobile hamburger */}
              <button
                className="amz-hamburger mobile-only"
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Category Bar ─────────────────────────────── */}
        <nav className="amz-nav hide-mobile" aria-label="Shop by category">
          <div className="amz-nav__inner">
            <button
              className="amz-nav__item amz-nav__item--menu"
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              <FiMenu size={16} style={{ marginRight: 4 }} />
              {t.nav_all}
            </button>
            {PRODUCT_CATEGORIES.slice(0, 9).map((cat) => (
              <Link key={cat} to={`/category/${encodeURIComponent(cat)}`} className="amz-nav__item">
                {CATEGORY_ICONS[cat]} {cat}
              </Link>
            ))}
            <Link to="/deals" className="amz-nav__item amz-nav__item--highlight">
              {t.nav_todays_deals}
            </Link>
            {user?.role === ROLES.ADMIN && (
              <Link
                to="/admin"
                className="amz-nav__item"
                style={{
                  color: '#FF9900',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <FiSettings size={14} /> Admin Console
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="amz-mobile-menu">
          <div className="amz-mobile-menu__backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="amz-mobile-menu__panel">
            <div className="amz-mobile-menu__header">
              {isAuthenticated ? (
                <UserAvatar src={user?.profileImage} name={fullName} size={36} />
              ) : (
                <FiUser size={20} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  {isAuthenticated ? fullName : `${t.nav_hello}, ${t.nav_signin}`}
                </div>
                {isAuthenticated && (
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      opacity: 0.7,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.email}
                  </div>
                )}
              </div>
              <button className="amz-mobile-menu__close" onClick={() => setMobileMenuOpen(false)}>
                <FiX size={22} />
              </button>
            </div>

            {/* Mobile search */}
            <form className="amz-mobile-menu__search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder={t.nav_search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="amz-mobile-menu__search-input"
              />
              <button type="submit" className="amz-mobile-menu__search-btn">
                <FiSearch size={18} />
              </button>
            </form>

            {/* Language selector in mobile */}
            <div
              className="amz-mobile-menu__section-title"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiGlobe size={14} /> {t.nav_language}
            </div>
            <div className="amz-mobile-lang-grid">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`amz-mobile-lang-btn${lang.code === currentLang ? ' amz-mobile-lang-btn--active' : ''}`}
                  onClick={() => setLanguage(lang.code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.code.toUpperCase()}</span>
                </button>
              ))}
            </div>

            <div className="amz-mobile-menu__section-title">{t.mob_shop_dept}</div>
            {PRODUCT_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/category/${encodeURIComponent(cat)}`}
                className="amz-mobile-menu__link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </Link>
            ))}

            <div className="amz-mobile-menu__divider" />
            <div className="amz-mobile-menu__section-title">Currency & Settings</div>
            <div style={{ padding: '0.25rem 1rem 0.5rem' }}>
              <CurrencySelector variant="compact" />
            </div>

            <div className="amz-mobile-menu__divider" />
            <div className="amz-mobile-menu__section-title">{t.mob_help}</div>
            <Link
              to="/deals"
              className="amz-mobile-menu__link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.nav_todays_deals}
            </Link>
            <Link
              to="/orders"
              className="amz-mobile-menu__link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.acc_orders}
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="amz-mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Dashboard
                </Link>
                <Link
                  to="/messages"
                  className="amz-mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiMessageSquare size={15} style={{ marginRight: 6 }} /> Messages
                  {unreadMsgCount > 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        background: '#FF9900',
                        color: '#0f172a',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 10,
                      }}
                    >
                      {unreadMsgCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/dashboard/wishlist"
                  className="amz-mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Wishlist
                </Link>
                <Link
                  to="/profile"
                  className="amz-mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.acc_profile}
                </Link>
                {user?.role === ROLES.ADMIN && (
                  <Link
                    to="/admin"
                    className="amz-mobile-menu__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t.acc_admin}
                  </Link>
                )}
                <button
                  className="amz-mobile-menu__link amz-mobile-menu__link--btn"
                  onClick={handleLogout}
                >
                  {t.acc_sign_out}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="amz-mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.acc_sign_in}
                </Link>
                <Link
                  to="/register"
                  className="amz-mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.acc_register}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
