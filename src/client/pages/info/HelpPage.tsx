import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaQuestionCircle,
  FaBoxOpen,
  FaUndo,
  FaCreditCard,
  FaLock,
  FaStore,
  FaEnvelope,
  FaChevronDown,
  FaChevronUp,
  FaSearch,
  FaComments,
} from 'react-icons/fa'

export const HelpPage: FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const quickLinks = [
    {
      title: 'Your Orders & Tracking',
      desc: 'Track deliveries, view carrier milestones, and download invoices.',
      icon: FaBoxOpen,
      to: '/orders',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      title: 'Returns & Refunds',
      desc: 'Print prepaid return labels and check refund status.',
      icon: FaUndo,
      to: '/returns',
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      title: 'Payment & Wallet',
      desc: 'Manage credit cards, reload Cartiva Balance, and redeem gift cards.',
      icon: FaCreditCard,
      to: '/payment',
      color: '#d97706',
      bg: '#fef3c7',
    },
    {
      title: 'Account & Security',
      desc: 'Update passwords, 2FA security keys, and saved addresses.',
      icon: FaLock,
      to: '/profile',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      title: 'Seller & Vendor Hub',
      desc: 'Manage catalog listings, merchant payouts, and buyer inquiries.',
      icon: FaStore,
      to: '/seller',
      color: '#db2777',
      bg: '#fdf2f8',
    },
  ]

  const faqs = [
    {
      q: 'How do I track my active package delivery?',
      a: 'Navigate to Your Orders in the top navbar or footer. Click "Track Package" next to any active order to see real-time carrier milestones, live dispatch location, and estimated arrival window.',
    },
    {
      q: 'What is the Cartiva 30-Day Money-Back Guarantee & Return Policy?',
      a: 'All eligible items purchased from verified Cartiva merchants can be returned within 30 days of delivery. Visit your Returns Dashboard to generate a prepaid USPS/FedEx return label. Once the item is scanned at the return facility, your refund is automatically credited to your original payment method or instant Wallet balance.',
    },
    {
      q: 'How does atomic inventory and buyer protection work on Cartiva?',
      a: 'Cartiva operates an automated escrow protection layer. When you place an order, stock is atomically reserved to prevent overselling, and your funds are held safely until the seller dispatches the package. If an order fails to arrive or is not as described, you receive an immediate 100% refund.',
    },
    {
      q: 'How do I reload my Cartiva Balance or redeem a Gift Card?',
      a: 'Visit the "Reload Balance" or "Gift Cards" pages in the footer. You can choose preset amounts ($25, $50, $100, $200) or enter a custom amount. For gift cards, enter your 16-character claim code to instantly apply funds to your account.',
    },
    {
      q: 'How do I become a verified seller on Cartiva?',
      a: 'Click "Sell on Cartiva" in the footer or visit the Vendor Registration page. Provide your business registration and identity documents. Once verified, you gain instant access to the merchant storefront builder, real-time inventory management, and automated weekly payouts.',
    },
    {
      q: 'What payment methods does Cartiva accept?',
      a: 'Cartiva accepts all major credit and debit cards (Visa, Mastercard, American Express, Discover), Cartiva Balance, eGift Cards, and regional payment gateways (Stripe, Paystack) with PCI-DSS Level 1 bank-grade tokenization.',
    },
  ]

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section with Search Input */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(49, 46, 129, 0.25)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <FaQuestionCircle /> Cartiva 24/7 Help & Support Center
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
            How can we help you today?
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#c7d2fe',
              maxWidth: '680px',
              lineHeight: 1.7,
              margin: '0 auto 32px',
            }}
          >
            Search our knowledge base or select a topic below to resolve order, shipping, payment,
            or seller inquiries.
          </p>

          {/* Large Search Bar */}
          <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
            <FaSearch
              style={{
                position: 'absolute',
                left: '20px',
                top: '18px',
                color: '#94a3b8',
                fontSize: '18px',
              }}
            />
            <input
              type="text"
              placeholder="Search help articles, returns, tracking, payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px 16px 52px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Quick Action Tiles Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.title}
                to={link.to}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '24px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: link.bg,
                      color: link.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      marginBottom: '16px',
                    }}
                  >
                    <Icon />
                  </div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 6px',
                    }}
                  >
                    {link.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    {link.desc}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* FAQ Accordion Section */}
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
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px' }}>
            Instant answers to our most common buyer and seller questions.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={faq.q}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    background: isOpen ? '#f8fafc' : '#ffffff',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <FaChevronUp style={{ color: '#4f46e5' }} />
                    ) : (
                      <FaChevronDown style={{ color: '#94a3b8' }} />
                    )}
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 24px 20px',
                        color: '#475569',
                        fontSize: '14px',
                        lineHeight: 1.7,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 24/7 Dedicated Support Channels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}
            >
              <FaEnvelope />
            </div>
            <div>
              <h3
                style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
              >
                Email Customer Care
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                support@cartiva.com • Average response under 15 mins
              </p>
              <a
                href="mailto:support@cartiva.com"
                style={{
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                Send Support Email &rarr;
              </a>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}
            >
              <FaComments />
            </div>
            <div>
              <h3
                style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
              >
                Live Support Assistant
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                24/7 automated order resolution & live representative handoff
              </p>
              <Link
                to="/messages"
                style={{
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                Start Live Chat &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
