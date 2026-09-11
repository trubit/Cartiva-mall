import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaMoneyBillWave, FaPercentage, FaCalculator, FaArrowRight } from 'react-icons/fa'

export const AffiliatePage: FC = () => {
  const [traffic, setTraffic] = useState<number>(25000)
  const [conversionRate, setConversionRate] = useState<number>(3)
  const [avgOrder, setAvgOrder] = useState<number>(75)

  // Estimated monthly earnings: traffic * (convRate/100) * avgOrder * averageCommissionRate (8%)
  const estimatedOrders = Math.round(traffic * (conversionRate / 100))
  const estimatedRevenue = estimatedOrders * avgOrder
  const estimatedCommission = Math.round(estimatedRevenue * 0.08)

  const commissionTiers = [
    {
      category: 'Digital & Software Products',
      rate: '15.0%',
      desc: 'eBooks, digital vouchers, software licenses',
    },
    {
      category: 'Fashion, Apparel & Jewelry',
      rate: '12.0%',
      desc: 'Designer clothing, shoes, watches & accessories',
    },
    {
      category: 'Beauty, Health & Wellness',
      rate: '10.0%',
      desc: 'Skincare, cosmetics, vitamins & fitness goods',
    },
    {
      category: 'Home, Garden & Kitchen',
      rate: '8.0%',
      desc: 'Furniture, kitchen appliances & home decor',
    },
    {
      category: 'Consumer Electronics & Computing',
      rate: '5.0%',
      desc: 'Smartphones, laptops, audio & gaming gear',
    },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #047857 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(5, 150, 105, 0.25)',
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
            <FaMoneyBillWave /> Cartiva Associates & Creator Program
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
            Earn Up to 15% Commission on Millions of Products
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#d1fae5',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}
          >
            Monetize your website, social channels, newsletters, and community blogs. Recommend
            trending products from verified merchants and get paid real-time payouts directly to
            your bank account.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              style={{
                background: '#ffffff',
                color: '#047857',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
            >
              Join the Affiliate Program Free
            </Link>
            <Link
              to="/help"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Affiliate Policy & FAQ
            </Link>
          </div>
        </div>

        {/* 3 Step Workflow */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Sign Up in 60 Seconds
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              No approval waiting periods. Create your account and get immediate access to your
              custom affiliate ID and link generator.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Share Customized Links
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Link directly to any product page, category showcase, or seasonal flash deal with
              30-day cookie attribution.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Collect Bi-Weekly Payouts
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Earn automatic direct bank deposits or PayPal payouts with real-time conversion
              dashboards and line-item analytics.
            </p>
          </div>
        </div>

        {/* Interactive Earnings Calculator & Commission Rates Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Earnings Calculator */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <FaCalculator />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  Estimated Earnings Calculator
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Simulate your monthly affiliate revenue
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  <span>Monthly Clicks / Traffic:</span>
                  <span style={{ color: '#059669' }}>{traffic.toLocaleString()} visitors</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="200000"
                  step="1000"
                  value={traffic}
                  onChange={(e) => setTraffic(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#059669' }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  <span>Conversion Rate:</span>
                  <span style={{ color: '#059669' }}>{conversionRate}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#059669' }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  <span>Average Order Value:</span>
                  <span style={{ color: '#059669' }}>${avgOrder}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="5"
                  value={avgOrder}
                  onChange={(e) => setAvgOrder(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#059669' }}
                />
              </div>
            </div>

            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: '#166534',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Estimated Monthly Commission
              </div>
              <div style={{ fontSize: '38px', fontWeight: 800, color: '#15803d', margin: '6px 0' }}>
                ${estimatedCommission.toLocaleString()}{' '}
                <span style={{ fontSize: '16px', fontWeight: 600 }}>/ mo</span>
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Based on ~{estimatedOrders.toLocaleString()} orders generating $
                {estimatedRevenue.toLocaleString()} in sales.
              </div>
            </div>
          </div>

          {/* Commission Tiers Table */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <FaPercentage />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  Fixed Commission Rates
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Category-specific earnings breakdown
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {commissionTiers.map((tier) => (
                <div
                  key={tier.category}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin: '0 0 2px',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {tier.category}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{tier.desc}</p>
                  </div>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      fontSize: '15px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      flexShrink: 0,
                    }}
                  >
                    {tier.rate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '44px 36px',
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
              Ready to Start Earning Today?
            </h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Create your affiliate account, generate your first deep link, and start earning on
              every referral.
            </p>
          </div>
          <Link
            to="/register"
            style={{
              background: '#059669',
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
            Create Affiliate Account <FaArrowRight style={{ fontSize: '12px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AffiliatePage
