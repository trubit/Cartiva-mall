import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  FaUndo,
  FaShieldAlt,
  FaPrint,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowRight,
  FaBoxOpen,
} from 'react-icons/fa'

export const ReturnsPolicyPage: FC = () => {
  const returnSteps = [
    {
      step: '1',
      title: 'Initiate in Your Dashboard',
      desc: 'Select the item you wish to return or exchange from your Orders or Returns Dashboard within 30 days of delivery.',
      icon: FaBoxOpen,
    },
    {
      step: '2',
      title: 'Print Prepaid Return Label',
      desc: 'Download and print an instant prepaid FedEx or USPS return shipping label provided free for all defective or incorrect items.',
      icon: FaPrint,
    },
    {
      step: '3',
      title: 'Drop Off with Courier',
      desc: 'Package the item securely in its original packaging and drop it off at any authorized carrier parcel drop box or retail counter.',
      icon: FaTruck,
    },
    {
      step: '4',
      title: 'Instant Refund or Replacement',
      desc: 'Once the carrier scans your package in transit, your replacement is dispatched immediately or your refund is issued in full.',
      icon: FaUndo,
    },
  ]

  const eligibleItems = [
    'Clothing, apparel, shoes & jewelry in unworn condition with original tags attached',
    'Electronics, mobile phones & computing gear with original packaging and all accessories included',
    'Home, kitchen appliances & furniture within 30 days of confirmed delivery',
    'Any defective, damaged, or incorrectly fulfilled item reported within warranty',
  ]

  const nonEligibleItems = [
    'Perishable goods, fresh groceries, and food items with expired shelf life',
    'Personalized, custom-engraved, or bespoke handmade merchandise',
    'Downloadable digital software, gift cards, and unsealed digital voucher codes',
    'Intimate apparel or hygiene items that have been unsealed or used',
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(4, 120, 87, 0.25)',
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
            <FaShieldAlt /> 100% Risk-Free Guarantee
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
            Cartiva 30-Day Returns & Replacements Policy
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
            We stand behind every purchase on Cartiva. If you are not 100% satisfied with your
            order, return it easily within 30 days for a full refund or instant replacement.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/dashboard/returns"
              style={{
                background: '#ffffff',
                color: '#047857',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FaUndo /> Start a Return in Dashboard
            </Link>
            <Link
              to="/orders"
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
              View Recent Orders
            </Link>
          </div>
        </div>

        {/* 4 Step Process Grid */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              How Self-Service Returns Work
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              4 simple steps with zero restocking fees on standard eligible returns.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {returnSteps.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.step}
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
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: '#ecfdf5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        <Icon />
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '3px 10px',
                          borderRadius: '20px',
                        }}
                      >
                        Step {s.step}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: '0 0 8px',
                      }}
                    >
                      {s.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Eligibility Breakdown Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {/* Eligible */}
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
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
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
                <FaCheckCircle />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Eligible for Return / Exchange
              </h3>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {eligibleItems.map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: 1.6,
                  }}
                >
                  <FaCheckCircle
                    style={{ color: '#10b981', fontSize: '14px', flexShrink: 0, marginTop: '4px' }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Non-Eligible */}
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
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <FaTimesCircle />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Non-Returnable Items
              </h3>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {nonEligibleItems.map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: 1.6,
                  }}
                >
                  <FaTimesCircle
                    style={{ color: '#ef4444', fontSize: '14px', flexShrink: 0, marginTop: '4px' }}
                  />
                  <span>{item}</span>
                </div>
              ))}
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
              Need Help with a Damaged or Missing Item?
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Our 24/7 dispute resolution team can directly contact the merchant on your behalf or
              approve instant replacements.
            </p>
          </div>
          <Link
            to="/help"
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
            Contact Customer Support <FaArrowRight style={{ fontSize: '12px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ReturnsPolicyPage
