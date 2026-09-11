import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  FaRocket,
  FaShieldAlt,
  FaGlobe,
  FaUsers,
  FaAward,
  FaChartLine,
  FaStore,
  FaCheckCircle,
  FaHeart,
} from 'react-icons/fa'

export const AboutUsPage: FC = () => {
  const stats = [
    { label: 'Verified Global Merchants', value: '50,000+', icon: FaStore, color: '#3b82f6' },
    { label: 'Active Monthly Shoppers', value: '4.2M+', icon: FaUsers, color: '#10b981' },
    { label: 'Countries Supported', value: '140+', icon: FaGlobe, color: '#8b5cf6' },
    { label: 'Platform Order Uptime', value: '99.99%', icon: FaAward, color: '#f59e0b' },
  ]

  const pillars = [
    {
      title: 'Decentralized Merchant Empowerment',
      desc: 'We provide enterprise-grade storefront infrastructure, real-time analytics, and automated escrow payouts to independent creators and multinational brands alike.',
      icon: FaStore,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      title: 'Zero-Trust Buyer Protection',
      desc: 'Every order is secured by atomic stock reservations, end-to-end PCI-DSS payment tokenization, and our guaranteed 30-day money-back escrow protection policy.',
      icon: FaShieldAlt,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      title: 'Autonomous Economy & High-Scale Tech',
      desc: 'Engineered on microsecond response microservices, intelligent automated inventory rebalancing, and transparent real-time package dispatch logistics.',
      icon: FaChartLine,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
  ]

  const timeline = [
    {
      year: '2023',
      title: 'The Genesis',
      desc: 'Cartiva was founded with a mission to eliminate vendor lock-in and create a fair, transparent e-commerce ecosystem.',
    },
    {
      year: '2024',
      title: 'Global Multi-Vendor Expansion',
      desc: 'Scaled to support cross-border multi-currency transactions, instant Paystack & Stripe gateway routing, and live tracking.',
    },
    {
      year: '2025',
      title: 'Enterprise Merchant Suite',
      desc: 'Introduced merchant storefront builders, commission engines, automated return reconciliation, and partner REST webhooks.',
    },
    {
      year: '2026',
      title: 'Next-Gen Marketplace Platform',
      desc: 'Launched autonomous economy orchestration, sub-second latency global catalog search, and AI-driven fraud intelligence.',
    },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.25)',
            position: 'relative',
            overflow: 'hidden',
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
            <FaRocket /> The Cartiva Vision
          </div>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 800,
              margin: '0 0 16px',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: '#ffffff',
            }}
          >
            Transforming Global Commerce with Trust, Speed & Scale
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#cbd5e1',
              maxWidth: '820px',
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}
          >
            Cartiva is a modern multi-vendor commerce powerhouse. We connect forward-thinking
            independent sellers and global brands with millions of passionate shoppers through
            world-class e-commerce technology, transparent escrow protection, and frictionless
            global fulfillment.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
              }}
            >
              Start Selling on Cartiva
            </Link>
            <Link
              to="/products"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              Explore Marketplace
            </Link>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: `${s.color}15`,
                    color: s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                  }}
                >
                  <Icon />
                </div>
                <div>
                  <div
                    style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      fontWeight: 500,
                      marginTop: '4px',
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mission Pillars */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Built on Pillars of Integrity & Innovation
            </h2>
            <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
              Why millions of shoppers and tens of thousands of merchants choose Cartiva every
              single day.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {pillars.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '32px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: p.bg,
                        color: p.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        marginBottom: '20px',
                      }}
                    >
                      <Icon />
                    </div>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: '0 0 12px',
                      }}
                    >
                      {p.title}
                    </h3>
                    <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                      {p.desc}
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: '24px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: p.color,
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <FaCheckCircle /> Verified Enterprise Standard
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Company Journey Timeline */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '44px 36px',
            marginBottom: '48px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              The Cartiva Journey
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              From a revolutionary prototype to a globally validated multi-tenant commerce
              ecosystem.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '24px',
            }}
          >
            {timeline.map((t) => (
              <div key={t.year} style={{ borderLeft: '3px solid #2563eb', paddingLeft: '18px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: 800,
                    fontSize: '14px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {t.year}
                </div>
                <h4
                  style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}
                >
                  {t.title}
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Culture & Global Values Banner */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f43f5e',
                fontSize: '14px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              <FaHeart /> Join Our Growing Global Community
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
              Ready to Shape the Future of E-Commerce?
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Discover career opportunities across engineering, product design, trust & safety, and
              global vendor success.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to="/careers"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              View Open Roles
            </Link>
            <Link
              to="/help"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Contact Press & Media
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutUsPage
