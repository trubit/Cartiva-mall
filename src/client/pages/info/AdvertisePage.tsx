import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaAd,
  FaBullseye,
  FaChartBar,
  FaSearch,
  FaRocket,
  FaArrowRight,
  FaEye,
  FaMousePointer,
  FaCoins,
} from 'react-icons/fa'

export const AdvertisePage: FC = () => {
  const [dailyBudget, setDailyBudget] = useState<number>(50)

  // Estimator: $50/day = ~12,500 impressions, ~375 high-intent clicks, ~4.8x average ROAS
  const estImpressions = Math.round(dailyBudget * 250)
  const estClicks = Math.round(dailyBudget * 7.5)
  const estSales = Math.round(dailyBudget * 4.8 * 30) // monthly sales

  const adFormats = [
    {
      title: 'Sponsored Product Listings',
      desc: 'Target high-intent shoppers directly at the top of organic search result pages and related product carousels.',
      icon: FaSearch,
      color: '#db2777',
      bg: '#fdf2f8',
      metrics: 'Average 4.8x ROAS',
    },
    {
      title: 'Sponsored Brand Storefronts',
      desc: 'Showcase your brand logo, custom headline, and a curated selection of up to 4 top products in premium search headers.',
      icon: FaBullseye,
      color: '#2563eb',
      bg: '#eff6ff',
      metrics: '+65% Brand Awareness',
    },
    {
      title: 'Display & Category Hero Banners',
      desc: 'High-visibility visual banner placements across home page hero rotations, category hubs, and cart checkout recommendations.',
      icon: FaChartBar,
      color: '#7c3aed',
      bg: '#f5f3ff',
      metrics: '3.2% Click-Through Rate',
    },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #831843 0%, #be185d 50%, #1e1b4b 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(190, 24, 93, 0.25)',
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
            <FaAd /> Cartiva Advertising & Sponsored Solutions
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
            Reach Ready-to-Buy Customers at the Moment of Purchase
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#fce7f3',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}
          >
            Maximize product sales, increase catalog visibility, and scale your brand with
            keyword-targeted sponsored search ads and display placements.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/seller"
              style={{
                background: '#ffffff',
                color: '#be185d',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
            >
              Launch an Ad Campaign
            </Link>
            <Link
              to="/register"
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
              Register as Seller First
            </Link>
          </div>
        </div>

        {/* Ad Formats Grid */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Tailored Advertising Formats for Every Goal
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              From individual product promotion to comprehensive brand awareness across the Cartiva
              marketplace.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {adFormats.map((fmt) => {
              const Icon = fmt.icon
              return (
                <div
                  key={fmt.title}
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
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: fmt.bg,
                        color: fmt.color,
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
                      {fmt.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                      {fmt.desc}
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: '24px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: fmt.color,
                        background: fmt.bg,
                        padding: '3px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      {fmt.metrics}
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                      Pay-per-click
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Interactive Campaign ROI Simulator */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '48px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#fdf2f8',
                color: '#db2777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              <FaCoins />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                Campaign Performance Simulator
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                Select your daily ad budget to project impressions, clicks, and monthly revenue.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                Daily Budget:
              </span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#db2777' }}>
                ${dailyBudget} / day
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#db2777' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
                marginTop: '4px',
              }}
            >
              <span>$10/day Starter</span>
              <span>$250/day Growth</span>
              <span>$500/day Scale</span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                <FaEye /> Projected Daily Impressions
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {estImpressions.toLocaleString()}+
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Targeted buyer views
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                <FaMousePointer /> Projected Daily Clicks
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {estClicks.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                High-intent shoppers
              </div>
            </div>

            <div
              style={{
                background: '#fdf2f8',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #fbcfe8',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#9d174d',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                <FaRocket /> Est. Monthly Attributed Sales
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#be185d' }}>
                ${estSales.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#9d174d', marginTop: '2px' }}>
                ~4.8x Return on Ad Spend
              </div>
            </div>
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
              Ready to Accelerate Your Product Sales?
            </h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Create your first sponsored campaign in less than 5 minutes from your Seller
              Dashboard.
            </p>
          </div>
          <Link
            to="/seller"
            style={{
              background: '#db2777',
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
            Go to Seller Ad Manager <FaArrowRight style={{ fontSize: '12px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdvertisePage
