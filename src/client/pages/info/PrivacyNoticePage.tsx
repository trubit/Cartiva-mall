import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaUserShield,
  FaDatabase,
  FaCookieBite,
  FaLock,
  FaSlidersH,
  FaEnvelope,
  FaGlobeAmericas,
  FaUserCheck,
  FaServer,
  FaTrashAlt,
} from 'react-icons/fa'

export const PrivacyNoticePage: FC = () => {
  const [activeSection, setActiveSection] = useState<string>('collection')

  const sections = [
    { id: 'collection', title: '1. Information We Collect', icon: FaDatabase },
    { id: 'usage', title: '2. How We Use Data', icon: FaServer },
    { id: 'payment-sec', title: '3. Payment & Escrow Security', icon: FaLock },
    { id: 'cookies', title: '4. Cookies & Tracking', icon: FaCookieBite },
    { id: 'sharing', title: '5. Third-Party Sharing', icon: FaGlobeAmericas },
    { id: 'rights', title: '6. GDPR & CCPA Your Rights', icon: FaUserCheck },
    { id: 'retention', title: '7. Data Retention & Deletion', icon: FaTrashAlt },
    { id: 'contact', title: '8. Contacting Data Officer', icon: FaEnvelope },
  ]

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
            borderRadius: '20px',
            padding: '40px 36px',
            color: '#ffffff',
            marginBottom: '32px',
            boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#6ee7b7',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <FaUserShield /> Privacy & Data Trust Commitment
          </div>
          <h1
            style={{
              fontSize: '34px',
              fontWeight: 800,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Cartiva Privacy Notice
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#e2e8f0',
              maxWidth: '780px',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            Your privacy is fundamental to our mission. This policy details our transparent data
            governance, PCI-compliant tokenized payments, and your legal rights under GDPR and
            CCPA/CPRA.
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#cbd5e1' }}>
            <span>
              <strong>Effective Date:</strong> August 2026
            </span>
            <span>•</span>
            <span>
              <strong>Compliance:</strong> GDPR, CCPA/CPRA, PCI-DSS Level 1
            </span>
          </div>
        </div>

        {/* Highlight Banner: Ad Privacy Choices Callout */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #a7f3d0',
            borderRadius: '16px',
            padding: '20px 28px',
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              <FaSlidersH />
            </div>
            <div>
              <h4
                style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}
              >
                Want to manage your targeted ad preferences?
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                You can toggle personalized ads, cross-site tracking, and third-party data sharing
                in 1 click.
              </p>
            </div>
          </div>
          <Link
            to="/privacy-choices"
            style={{
              background: '#059669',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Manage Ads Privacy Choices
          </Link>
        </div>

        {/* Layout Grid: Sticky Sidebar + Content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Quick Jump Sidebar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              position: 'sticky',
              top: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                margin: '0 0 16px',
                fontWeight: 700,
              }}
            >
              Privacy Sections
            </h3>
            <nav style={{ display: 'grid', gap: '6px' }}>
              {sections.map((sec) => {
                const Icon = sec.icon
                const isActive = activeSection === sec.id
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#ecfdf5' : 'transparent',
                      color: isActive ? '#059669' : '#475569',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <Icon
                      style={{
                        color: isActive ? '#059669' : '#94a3b8',
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {sec.title}
                    </span>
                  </button>
                )
              })}
            </nav>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <Link
                to="/conditions"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#059669',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginBottom: '8px',
                }}
              >
                &rarr; Conditions of Use
              </Link>
              <Link
                to="/help"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#059669',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                &rarr; Customer Support
              </Link>
            </div>
          </div>

          {/* Privacy Content Area */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Section 1 */}
            <div
              id="collection"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaDatabase />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  1. Information We Collect
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                We collect personal information that you provide directly to us when creating a
                Cartiva account, placing an order, submitting vendor credentials, or contacting
                customer support:
              </p>
              <ul
                style={{
                  color: '#334155',
                  lineHeight: 1.7,
                  margin: '0 0 12px',
                  paddingLeft: '24px',
                  fontSize: '14px',
                }}
              >
                <li>
                  <strong>Identity & Account Data:</strong> Full name, email address, password hash,
                  phone number, and delivery street address.
                </li>
                <li>
                  <strong>Merchant & Business Data:</strong> Tax identification number, business
                  registration documents, and payout bank accounts for verified sellers.
                </li>
                <li>
                  <strong>Device & Interaction Telemetry:</strong> IP address, browser type,
                  operating system, geolocation (country/state level), and pages viewed.
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div
              id="usage"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaServer />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  2. How We Use Your Data
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Cartiva uses your information strictly for legitimate commercial and operational
                purposes:
              </p>
              <ul
                style={{
                  color: '#334155',
                  lineHeight: 1.7,
                  margin: 0,
                  paddingLeft: '24px',
                  fontSize: '14px',
                }}
              >
                <li>
                  Order fulfillment, real-time shipment dispatch, and automated email receipts.
                </li>
                <li>AI-driven fraud prevention and anomaly detection to prevent identity theft.</li>
                <li>
                  Personalized product recommendations and relevant seller promotions (which can be
                  customized in{' '}
                  <Link to="/privacy-choices" style={{ color: '#059669', fontWeight: 600 }}>
                    Privacy Choices
                  </Link>
                  ).
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div
              id="payment-sec"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaLock />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  3. Bank-Grade Payment Tokenization & Escrow
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Cartiva complies with <strong>PCI-DSS Level 1</strong> standards. All credit card
                transactions are tokenized end-to-end via certified gateway partners (Stripe,
                Paystack).
              </p>
              <div
                style={{
                  background: '#f0fdf4',
                  borderLeft: '4px solid #059669',
                  padding: '14px 18px',
                  borderRadius: '4px',
                  margin: '14px 0',
                  fontSize: '14px',
                  color: '#166534',
                }}
              >
                <strong>Zero Plaintext Storage:</strong> Cartiva servers never receive, log, or
                store raw 16-digit card numbers or CVV security codes.
              </div>
            </div>

            {/* Section 4 */}
            <div
              id="cookies"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaCookieBite />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  4. Cookies & Tracking Technologies
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                We use strictly necessary cookies for session authentication and CSRF protection, as
                well as performance cookies for site optimization. You can review and adjust cookie
                preferences at any time in your{' '}
                <Link to="/privacy-choices" style={{ color: '#059669', fontWeight: 600 }}>
                  Ad Privacy Choices
                </Link>
                .
              </p>
            </div>

            {/* Section 5 & 6 */}
            <div
              id="rights"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaUserCheck />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  5. Your Rights (GDPR / CCPA / CPRA)
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Regardless of where you reside, Cartiva provides all registered users with direct
                self-service privacy tools:
              </p>
              <ul
                style={{
                  color: '#334155',
                  lineHeight: 1.7,
                  margin: '0 0 16px',
                  paddingLeft: '24px',
                  fontSize: '14px',
                }}
              >
                <li>
                  <strong>Right of Access & Portability:</strong> Request an export of your order
                  history, reviews, and profile data from Account Settings.
                </li>
                <li>
                  <strong>Right to Rectification:</strong> Update incorrect phone numbers or
                  shipping addresses in real time.
                </li>
                <li>
                  <strong>Right to Erasure (Deletion):</strong> Permanently purge your account and
                  personal identifiers under GDPR Right to be Forgotten.
                </li>
                <li>
                  <strong>Right to Opt-Out of Sale/Sharing:</strong> We do not sell personal data.
                  Manage advertising sharing via{' '}
                  <Link to="/privacy-choices" style={{ color: '#059669', fontWeight: 600 }}>
                    Your Ads Privacy Choices
                  </Link>
                  .
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyNoticePage
