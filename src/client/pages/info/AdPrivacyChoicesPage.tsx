import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaSlidersH,
  FaShieldAlt,
  FaCheckCircle,
  FaUserCheck,
  FaBullhorn,
  FaCookieBite,
  FaChartLine,
} from 'react-icons/fa'

export const AdPrivacyChoicesPage: FC = () => {
  const [personalizedAds, setPersonalizedAds] = useState(() => {
    try {
      const saved = localStorage.getItem('cartiva_ad_privacy_prefs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.personalizedAds === 'boolean') return parsed.personalizedAds
      }
    } catch {
      // ignore
    }
    return true
  })

  const [crossSiteTracking, setCrossSiteTracking] = useState(() => {
    try {
      const saved = localStorage.getItem('cartiva_ad_privacy_prefs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.crossSiteTracking === 'boolean') return parsed.crossSiteTracking
      }
    } catch {
      // ignore
    }
    return false
  })

  const [analyticsCookies, setAnalyticsCookies] = useState(() => {
    try {
      const saved = localStorage.getItem('cartiva_ad_privacy_prefs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.analyticsCookies === 'boolean') return parsed.analyticsCookies
      }
    } catch {
      // ignore
    }
    return true
  })

  const [marketingEmails, setMarketingEmails] = useState(() => {
    try {
      const saved = localStorage.getItem('cartiva_ad_privacy_prefs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.marketingEmails === 'boolean') return parsed.marketingEmails
      }
    } catch {
      // ignore
    }
    return true
  })

  const [savedToast, setSavedToast] = useState(false)

  const handleSave = () => {
    try {
      localStorage.setItem(
        'cartiva_ad_privacy_prefs',
        JSON.stringify({
          personalizedAds,
          crossSiteTracking,
          analyticsCookies,
          marketingEmails,
          updatedAt: new Date().toISOString(),
        }),
      )
    } catch {
      // ignore
    }
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 4000)
  }

  const handleOptOutAll = () => {
    setPersonalizedAds(false)
    setCrossSiteTracking(false)
    setAnalyticsCookies(false)
    setMarketingEmails(false)
    try {
      localStorage.setItem(
        'cartiva_ad_privacy_prefs',
        JSON.stringify({
          personalizedAds: false,
          crossSiteTracking: false,
          analyticsCookies: false,
          marketingEmails: false,
          optOutAll: true,
          updatedAt: new Date().toISOString(),
        }),
      )
    } catch {
      // ignore
    }
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 4000)
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        {/* Toast Notification */}
        {savedToast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              background: '#0f172a',
              color: '#ffffff',
              padding: '16px 24px',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <FaCheckCircle style={{ color: '#10b981', fontSize: '20px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Preferences Saved</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Your advertising privacy choices have been updated.
              </div>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '20px',
            padding: '40px 36px',
            color: '#ffffff',
            marginBottom: '32px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <FaSlidersH /> Privacy Control Center
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
            Your Ads Privacy Choices
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#cbd5e1',
              maxWidth: '720px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            You have control over how Cartiva and our advertising partners use your data to
            personalize ads, measure campaign efficacy, and deliver custom shopping experiences.
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
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
                <FaShieldAlt />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                Global Privacy Control
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              Cartiva honors browser-level opt-out signals such as Global Privacy Control (GPC).
              When detected, cross-site tracking is automatically disabled.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
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
                <FaUserCheck />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                State Rights (CCPA / CPRA)
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              Residents of California, Virginia, Colorado, and other supported jurisdictions can opt
              out of the “sale” or “sharing” of personal data for targeted advertising.
            </p>
          </div>
        </div>

        {/* Interactive Controls Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '36px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '24px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '28px',
            }}
          >
            <div>
              <h2
                style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}
              >
                Advertising & Data Sharing Settings
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                Toggle specific advertising categories below to customize your data profile.
              </p>
            </div>
            <button
              onClick={handleOptOutAll}
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Opt Out of All Optional Tracking
            </button>
          </div>

          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Setting 1: Personalized Advertising */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '20px',
                paddingBottom: '20px',
                borderBottom: '1px solid #f8fafc',
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
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
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <FaBullhorn />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    Personalized Marketplace Ads & Recommendations
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                    Allows Cartiva to use your browsing history, past purchases, and wishlist items
                    to suggest products you are most likely to love.
                  </p>
                </div>
              </div>
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '28px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={personalizedAds}
                  onChange={(e) => setPersonalizedAds(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: personalizedAds ? '#2563eb' : '#cbd5e1',
                    borderRadius: '34px',
                    transition: '0.3s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: personalizedAds ? '26px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Setting 2: Cross-Site Tracking & Third-Party Sharing */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '20px',
                paddingBottom: '20px',
                borderBottom: '1px solid #f8fafc',
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#fdf2f8',
                    color: '#db2777',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <FaCookieBite />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    Cross-Site Interest-Based Advertising & Social Partners
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                    Share pseudonymous identifiers with verified advertising networks (e.g., Google,
                    Meta) to show Cartiva deals on third-party websites and apps.
                  </p>
                </div>
              </div>
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '28px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={crossSiteTracking}
                  onChange={(e) => setCrossSiteTracking(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: crossSiteTracking ? '#db2777' : '#cbd5e1',
                    borderRadius: '34px',
                    transition: '0.3s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: crossSiteTracking ? '26px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Setting 3: Performance & Analytics */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '20px',
                paddingBottom: '20px',
                borderBottom: '1px solid #f8fafc',
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
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
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <FaChartLine />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    Analytics & Ad Performance Measurement
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                    Helps us understand how customers discover products and measure the
                    effectiveness of vendor promotions on Cartiva.
                  </p>
                </div>
              </div>
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '28px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={analyticsCookies}
                  onChange={(e) => setAnalyticsCookies(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: analyticsCookies ? '#059669' : '#cbd5e1',
                    borderRadius: '34px',
                    transition: '0.3s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: analyticsCookies ? '26px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Setting 4: Marketing Emails */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <FaSlidersH />
                </div>
                <div>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    Personalized Email & Push Promotions
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                    Receive tailored price-drop alerts, deal digests, and personalized discount
                    codes for items in your cart or saved lists.
                  </p>
                </div>
              </div>
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '28px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={marketingEmails}
                  onChange={(e) => setMarketingEmails(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: marketingEmails ? '#d97706' : '#cbd5e1',
                    borderRadius: '34px',
                    transition: '0.3s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '20px',
                      width: '20px',
                      left: marketingEmails ? '26px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s',
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          <div
            style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              onClick={handleSave}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
              }}
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* Detailed Explanatory Information */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            color: '#334155',
            lineHeight: 1.7,
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
            Frequently Asked Questions about Advertising Privacy
          </h3>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <h4
                style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}
              >
                What happens if I turn off personalized ads?
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                You will still see the same number of advertisements across Cartiva and partner
                networks, but they will be generic and not based on your past shopping activity,
                search terms, or interests.
              </p>
            </div>

            <div>
              <h4
                style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}
              >
                Does Cartiva sell my personal contact information?
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                No. Cartiva does not sell your name, email address, phone number, physical address,
                or payment credentials to data brokers or advertisers. Any advertising data shared
                with advertising networks uses encrypted, non-reversible pseudonymous tokens.
              </p>
            </div>

            <div>
              <h4
                style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}
              >
                How do I reset my mobile device advertising ID?
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                On iOS, go to <em>Settings &gt; Privacy &amp; Security &gt; Tracking</em> and turn
                off “Allow Apps to Request to Track”. On Android, go to{' '}
                <em>Settings &gt; Privacy &gt; Ads</em> and tap “Delete advertising ID”.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <Link
              to="/privacy"
              style={{
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              &larr; Return to Privacy Notice
            </Link>
            <Link
              to="/conditions"
              style={{
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              View Conditions of Use &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdPrivacyChoicesPage
