import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  FaShieldAlt,
  FaLock,
  FaCreditCard,
  FaWallet,
  FaCheckCircle,
  FaBolt,
  FaRegCheckCircle,
  FaArrowRight,
  FaGlobe,
  FaExchangeAlt,
} from 'react-icons/fa'

export const PaymentSecurityPage: FC = () => {
  const securityFeatures = [
    {
      title: 'PCI-DSS Level 1 Certified Tokenization',
      desc: 'All payment data is encrypted in transit and tokenized at rest via certified global payment gateways (Stripe & Paystack). Raw card numbers and CVVs never touch or reside on our application servers.',
      icon: FaLock,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      title: 'Automated Escrow Buyer Protection',
      desc: 'Your payment is safely held in escrow until the merchant fulfills and dispatches your order with verified carrier tracking. If any item is missing or damaged, our escrow guarantee issues an instant full refund.',
      icon: FaShieldAlt,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      title: 'AI Anomaly & Fraud Defense',
      desc: 'Every transaction is analyzed in real-time by velocity signal checkers and machine learning fraud engines, shielding shoppers and merchants from unauthorized account takeovers.',
      icon: FaBolt,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      title: 'Multi-Currency Global Checkout',
      desc: 'Seamlessly pay in USD or your local currency with transparent zero-hidden-fee exchange rates, local bank debit rails, and instant electronic transfer options.',
      icon: FaGlobe,
      color: '#d97706',
      bg: '#fef3c7',
    },
  ]

  const paymentMethods = [
    {
      name: 'Major Credit / Debit Cards',
      desc: 'Visa, Mastercard, American Express, Discover',
      icon: FaCreditCard,
    },
    {
      name: 'Cartiva Wallet Balance',
      desc: 'Instant 1-click checkout with 2% reload bonus rewards',
      icon: FaWallet,
    },
    {
      name: 'Digital eGift Cards',
      desc: 'Apply prepaid gift codes directly at checkout',
      icon: FaCheckCircle,
    },
    {
      name: 'Regional Gateways',
      desc: 'Paystack, Cards, USSD, Apple Pay & Mobile Money',
      icon: FaExchangeAlt,
    },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #091e3a 0%, #1e3a8a 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(30, 58, 138, 0.25)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <FaShieldAlt /> 100% Secure Payment Architecture
          </div>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 800,
              margin: '0 0 16px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Bank-Grade Security & Buyer Escrow Protection
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#bfdbfe',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}
          >
            Shop with total peace of mind. Every transaction on Cartiva is safeguarded by end-to-end
            encryption, PCI-DSS Level 1 tokenization, and our 100% money-back buyer protection
            guarantee.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/reload"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
              }}
            >
              Manage Cartiva Wallet
            </Link>
            <Link
              to="/orders"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              View Order Receipts
            </Link>
          </div>
        </div>

        {/* Security Features Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {securityFeatures.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '32px 24px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: f.bg,
                      color: f.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      marginBottom: '20px',
                    }}
                  >
                    <Icon />
                  </div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 10px',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: f.color,
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <FaRegCheckCircle /> Enterprise Security Verified
                </div>
              </div>
            )
          })}
        </div>

        {/* Accepted Payment Methods Section */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '48px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Accepted Payment Methods
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              Convenient, fast, and protected payment rails for buyers globally.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {paymentMethods.map((m) => {
              const Icon = m.icon
              return (
                <div
                  key={m.name}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    background: '#fcfdfe',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      marginBottom: '14px',
                    }}
                  >
                    <Icon />
                  </div>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 6px',
                    }}
                  >
                    {m.name}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    {m.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '40px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
              Have Questions About a Charge or Receipt?
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Our 24/7 billing and customer protection team is always available to assist with
              transaction queries.
            </p>
          </div>
          <Link
            to="/help"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '14px 28px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '15px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Visit Help Center <FaArrowRight style={{ fontSize: '12px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PaymentSecurityPage
