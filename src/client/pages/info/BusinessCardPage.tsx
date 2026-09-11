import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaCreditCard,
  FaPercent,
  FaUsersCog,
  FaShieldAlt,
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaArrowRight,
} from 'react-icons/fa'

export const BusinessCardPage: FC = () => {
  const [activePlan, setActivePlan] = useState<'cashback' | 'terms'>('cashback')
  const [applyNotice, setApplyNotice] = useState<string | null>(null)

  const cardFeatures = [
    {
      title: '5% Cash Back or 90 Days 0% APR',
      desc: 'Choose between 5% back on all eligible marketplace purchases or 90 days interest-free financing to optimize working capital.',
      icon: FaPercent,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      title: 'Automated Line-Item Accounting Sync',
      desc: 'Automatic real-time transaction synchronization with QuickBooks, Xero, NetSuite, and Sage with split-tax categorization.',
      icon: FaFileInvoiceDollar,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      title: 'Employee Sub-Cards & Custom Limits',
      desc: 'Issue physical and virtual cards to your purchasing team with department-level daily budgets, merchant whitelisting, and approvals.',
      icon: FaUsersCog,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      title: 'Zero Annual Fee & Zero FX Tariffs',
      desc: 'Enjoy commercial purchasing power with zero annual membership fees and fee-free international currency cross-border transactions.',
      icon: FaShieldAlt,
      color: '#d97706',
      bg: '#fef3c7',
    },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {applyNotice && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>Commercial Card Application:</strong> {applyNotice}
            </div>
            <button
              onClick={() => setApplyNotice(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#1e40af',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Section with Interactive Card Mockup */}
        <div
          style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e293b 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            alignItems: 'center',
            gap: '40px',
          }}
        >
          <div>
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
              <FaCreditCard /> Cartiva Commercial Titanium
            </div>
            <h1
              style={{
                fontSize: '40px',
                fontWeight: 800,
                margin: '0 0 16px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                color: '#ffffff',
              }}
            >
              The Ultimate Credit Card for Growing Businesses
            </h1>
            <p style={{ fontSize: '17px', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 32px' }}>
              Maximize purchasing margins with 5% cash back or flexible 90-day payment terms on all
              Cartiva business and inventory expenditures.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() =>
                  setApplyNotice(
                    'Commercial card underwriting is reviewed by enterprise invitation. Submit your business merchant credentials to enterprise-support@cartiva.mall for priority onboarding.',
                  )
                }
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '14px 32px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
                }}
              >
                Apply in 3 Minutes
              </button>
              <Link
                to="/help"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '15px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Card Terms & Rates
              </Link>
            </div>
          </div>

          {/* Titanium Metallic Card Mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '380px',
                height: '230px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                padding: '28px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow:
                  '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    color: '#ffffff',
                  }}
                >
                  CARTIVA
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  BUSINESS TITANIUM
                </div>
              </div>

              {/* EMV Chip */}
              <div
                style={{
                  width: '44px',
                  height: '34px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                  border: '1px solid #b45309',
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: '16px',
                    letterSpacing: '3px',
                    color: '#f8fafc',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                  }}
                >
                  •••• &nbsp;•••• &nbsp;•••• &nbsp;8842
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginTop: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Cardholder
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                        letterSpacing: '0.5px',
                      }}
                    >
                      ENTERPRISE CORP
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                    VISA BUSINESS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          {cardFeatures.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: f.bg,
                      color: f.color,
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
                      fontSize: '17px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 8px',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Reward Plan Selector */}
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
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Choose Your Reward Preference
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              Toggle your primary reward mode anytime directly in your Account Dashboard.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Option 1: 5% Cash Back */}
            <div
              onClick={() => setActivePlan('cashback')}
              style={{
                border: activePlan === 'cashback' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: activePlan === 'cashback' ? '#eff6ff' : '#ffffff',
                borderRadius: '18px',
                padding: '28px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  5% Cash Back Rewards
                </span>
                {activePlan === 'cashback' && (
                  <FaCheckCircle style={{ color: '#2563eb', fontSize: '20px' }} />
                )}
              </div>
              <p
                style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}
              >
                Earn 5% cash back on the first $120,000 in eligible annual Cartiva purchases. Cash
                back auto-applies to your statement balance each billing cycle.
              </p>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                Best for: Maximizing operational profit margins
              </div>
            </div>

            {/* Option 2: 90 Days Terms */}
            <div
              onClick={() => setActivePlan('terms')}
              style={{
                border: activePlan === 'terms' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: activePlan === 'terms' ? '#eff6ff' : '#ffffff',
                borderRadius: '18px',
                padding: '28px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  90-Day Interest-Free Terms
                </span>
                {activePlan === 'terms' && (
                  <FaCheckCircle style={{ color: '#2563eb', fontSize: '20px' }} />
                )}
              </div>
              <p
                style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}
              >
                Pay 0% interest on qualified wholesale and inventory purchases for 90 days. Defer
                payments smoothly without cash-flow friction.
              </p>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                Best for: Inventory wholesale & seasonal restocking
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
              Power Up Your Commercial Purchasing Power
            </h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              No impact on credit score during pre-qualification. Instant digital card issuance upon
              approval.
            </p>
          </div>
          <button
            onClick={() =>
              setApplyNotice(
                'Commercial card underwriting is reviewed by enterprise invitation. Submit your business merchant credentials to enterprise-support@cartiva.mall for priority onboarding.',
              )
            }
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Apply Online <FaArrowRight style={{ fontSize: '12px' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BusinessCardPage
