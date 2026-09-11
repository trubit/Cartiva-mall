import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaShippingFast,
  FaPlane,
  FaBoxOpen,
  FaGlobeAmericas,
  FaTruck,
  FaSearch,
  FaCheckCircle,
  FaShieldAlt,
  FaClock,
  FaArrowRight,
} from 'react-icons/fa'

export const ShippingRatesPage: FC = () => {
  const [trackingNumber, setTrackingNumber] = useState<string>('')

  const rates = [
    {
      name: 'Standard Ground Delivery',
      time: '3–5 Business Days',
      thresholdRate: 'FREE on orders $35+',
      standardRate: '$4.99 flat rate',
      icon: FaBoxOpen,
      color: '#2563eb',
      bg: '#eff6ff',
      features: [
        'Full end-to-end tracking',
        'Safe contactless doorstep drop',
        'Carbon-neutral transit',
      ],
    },
    {
      name: 'Cartiva Express 2-Day',
      time: '2 Business Days',
      thresholdRate: '$7.99 (orders $35+)',
      standardRate: '$9.99 flat rate',
      icon: FaShippingFast,
      color: '#d97706',
      bg: '#fef3c7',
      features: ['Guaranteed delivery date', 'Priority warehouse dispatch', 'SMS delivery alerts'],
    },
    {
      name: 'Priority Next-Day Air',
      time: '1 Business Day',
      thresholdRate: '$14.99 (orders $35+)',
      standardRate: '$17.99 flat rate',
      icon: FaPlane,
      color: '#dc2626',
      bg: '#fef2f2',
      features: [
        'Next-morning flight routing',
        'Signature on delivery',
        '100% money-back time guarantee',
      ],
    },
    {
      name: 'Global International Express',
      time: '5–9 Business Days',
      thresholdRate: 'Calculated by Weight',
      standardRate: 'From $19.99',
      icon: FaGlobeAmericas,
      color: '#7c3aed',
      bg: '#f5f3ff',
      features: [
        '140+ countries covered',
        'Prepaid customs & duties',
        'Multi-carrier localized handover',
      ],
    },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(37, 99, 235, 0.25)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <FaTruck /> Fast & Transparent Delivery
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
            Shipping Rates & Delivery Estimates
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#bfdbfe',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Enjoy FREE Standard Ground Shipping on eligible orders over $35, real-time GPS parcel
            tracking, and priority next-day air options.
          </p>
        </div>

        {/* Quick Order Tracking Search Box */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '28px 36px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Track an Incoming Order
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Enter your Cartiva Order ID or carrier tracking number to view real-time transit
              milestones.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!trackingNumber.trim()) return
              window.location.href = `/orders`
            }}
            style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '440px' }}
          >
            <input
              type="text"
              placeholder="e.g. ORD-88492 or Tracking #"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            <Link
              to="/orders"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <FaSearch /> Track
            </Link>
          </form>
        </div>

        {/* Shipping Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {rates.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.name}
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
                      background: r.bg,
                      color: r.color,
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
                      margin: '0 0 8px',
                    }}
                  >
                    {r.name}
                  </h3>
                  <div
                    style={{
                      display: 'inline-block',
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      marginBottom: '16px',
                    }}
                  >
                    <FaClock style={{ marginRight: '4px' }} /> {r.time}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
                      {r.thresholdRate}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      Standard: {r.standardRate}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '16px',
                    }}
                  >
                    {r.features.map((feat) => (
                      <div
                        key={feat}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          color: '#475569',
                        }}
                      >
                        <FaCheckCircle
                          style={{ color: '#10b981', fontSize: '12px', flexShrink: 0 }}
                        />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Carrier Partners Banner */}
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
                color: '#60a5fa',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              <FaShieldAlt /> Certified Carrier Network
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
              Dispatched with Top Global Couriers
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Cartiva orders are processed and insured with FedEx, UPS, USPS, DHL Express, and
              regional last-mile postal partners.
            </p>
          </div>
          <Link
            to="/orders"
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
            View Your Orders <FaArrowRight style={{ fontSize: '12px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ShippingRatesPage
