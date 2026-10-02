import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaBoxOpen,
  FaTruck,
  FaSearch,
  FaCheckCircle,
  FaShieldAlt,
  FaClock,
  FaArrowRight,
} from 'react-icons/fa'
import { usePublicShippingConfig } from '../../hooks/useShipping.js'
import { useCurrency } from '../../hooks/useCurrency.js'
import { formatMoney } from '../../../shared/utils/money.js'

const CURRENCY_DETAILS: Record<string, { name: string; region: string; icon: string }> = {
  NGN: { name: 'Nigerian Naira', region: 'Nigeria & West Africa', icon: '🇳🇬' },
  USD: { name: 'US Dollar', region: 'United States & Americas', icon: '🇺🇸' },
  EUR: { name: 'Euro', region: 'European Union', icon: '🇪🇺' },
  GBP: { name: 'British Pound', region: 'United Kingdom', icon: '🇬🇧' },
  CAD: { name: 'Canadian Dollar', region: 'Canada', icon: '🇨🇦' },
  AUD: { name: 'Australian Dollar', region: 'Australia', icon: '🇦🇺' },
}

export const ShippingRatesPage: FC = () => {
  const [trackingNumber, setTrackingNumber] = useState<string>('')
  const { data: config, isLoading } = usePublicShippingConfig()
  const { currentCurrency, formatPrice } = useCurrency()

  const liveRates: Record<string, number> = {}
  if (config?.rates && typeof config.rates === 'object') {
    Object.assign(liveRates, config.rates)
  } else if (config?.fixedRates && typeof config.fixedRates === 'object') {
    Object.assign(liveRates, config.fixedRates)
  }

  const currencies = Object.keys(CURRENCY_DETAILS)
  const activeRate = liveRates[currentCurrency]

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
            <FaTruck /> Authoritative Admin Dynamic Shipping
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
            Shipping Rates & Delivery Logistics
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
            Transparent doorstep delivery rates centrally configured and guaranteed by Cartiva Mall
            administrators. All shipments include full GPS tracking and comprehensive parcel transit
            insurance.
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

        {/* Active Currency Highlight Card */}
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(255,153,0,0.08) 100%)',
            border: '2px solid rgba(37, 99, 235, 0.25)',
            borderRadius: '20px',
            padding: '28px 32px',
            marginBottom: '36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#2563eb',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              <FaBoxOpen /> Current Selected Currency Rate
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
              Standard Doorstep Delivery ({currentCurrency})
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Authoritative platform shipping fee applied at checkout for {currentCurrency} orders.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#16a34a' }}>
              {isLoading
                ? 'Loading…'
                : typeof activeRate === 'number'
                  ? formatPrice(activeRate, currentCurrency)
                  : 'Configured at Checkout'}
            </div>
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Authoritative Admin Rate
            </span>
          </div>
        </div>

        {/* Currency Rates Matrix Grid */}
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          Configured Regional Delivery Rates
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', marginTop: 0 }}>
          Live rates maintained directly by platform administrators for each supported global
          currency:
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          {currencies.map((curr) => {
            const details = CURRENCY_DETAILS[curr] || {
              name: curr,
              region: 'Global',
              icon: '🌐',
            }
            const rate = liveRates[curr]
            const isCurrent = curr === currentCurrency

            return (
              <div
                key={curr}
                style={{
                  background: '#ffffff',
                  border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '24px',
                  boxShadow: isCurrent
                    ? '0 10px 15px -3px rgba(37, 99, 235, 0.15)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '28px' }}>{details.icon}</span>
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#0f172a',
                          }}
                        >
                          {curr}
                        </h4>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{details.name}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                      {isLoading
                        ? '…'
                        : typeof rate === 'number'
                          ? formatMoney(rate, curr)
                          : 'Unset'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Doorstep Delivery · {details.region}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#475569',
                      }}
                    >
                      <FaCheckCircle
                        style={{ color: '#10b981', fontSize: '11px', flexShrink: 0 }}
                      />
                      <span>Live GPS parcel tracking</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#475569',
                      }}
                    >
                      <FaCheckCircle
                        style={{ color: '#10b981', fontSize: '11px', flexShrink: 0 }}
                      />
                      <span>Full transit insurance</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#475569',
                      }}
                    >
                      <FaClock style={{ color: '#64748b', fontSize: '11px', flexShrink: 0 }} />
                      <span>3–5 Business Days estimated</span>
                    </div>
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
