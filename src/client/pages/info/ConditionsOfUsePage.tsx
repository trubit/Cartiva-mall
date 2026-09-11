import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaGavel,
  FaShieldAlt,
  FaUserLock,
  FaUndo,
  FaTruck,
  FaRegCheckCircle,
  FaCreditCard,
  FaBalanceScale,
  FaExclamationTriangle,
  FaStore,
  FaFileContract,
} from 'react-icons/fa'

export const ConditionsOfUsePage: FC = () => {
  const [activeSection, setActiveSection] = useState<string>('acceptance')

  const sections = [
    { id: 'acceptance', title: '1. Acceptance & Scope', icon: FaShieldAlt },
    { id: 'accounts', title: '2. Accounts & Security', icon: FaUserLock },
    { id: 'marketplace', title: '3. Multi-Vendor Marketplace', icon: FaStore },
    { id: 'pricing', title: '4. Pricing & Atomic Inventory', icon: FaCreditCard },
    { id: 'shipping', title: '5. Shipping & Delivery', icon: FaTruck },
    { id: 'returns', title: '6. Returns & Refunds', icon: FaUndo },
    { id: 'ip', title: '7. Intellectual Property', icon: FaRegCheckCircle },
    { id: 'disputes', title: '8. Dispute Resolution', icon: FaBalanceScale },
    { id: 'liability', title: '9. Limitation of Liability', icon: FaExclamationTriangle },
    { id: 'modifications', title: '10. Terms Modification', icon: FaFileContract },
  ]

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e293b 100%)',
            borderRadius: '20px',
            padding: '40px 36px',
            color: '#ffffff',
            marginBottom: '32px',
            boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.3)',
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
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <FaGavel /> Official Legal Document
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
            Cartiva Conditions of Use
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#cbd5e1',
              maxWidth: '780px',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            Please read these terms and conditions carefully before accessing or using the Cartiva
            marketplace, mobile applications, merchant portals, or purchasing products.
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8' }}>
            <span>
              <strong>Last Updated:</strong> August 2026
            </span>
            <span>•</span>
            <span>
              <strong>Version:</strong> 3.4 Enterprise
            </span>
          </div>
        </div>

        {/* Layout Grid: Sticky Sidebar + Content Area */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Quick Jump Sidebar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              position: 'sticky',
              top: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                margin: '0 0 16px',
                fontWeight: 700,
              }}
            >
              Table of Contents
            </h3>
            <nav style={{ display: 'grid', gap: '6px' }}>
              {sections.map((sec) => {
                const Icon = sec.icon
                const isActive = activeSection === sec.id
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#eef2ff' : 'transparent',
                      color: isActive ? '#4f46e5' : '#475569',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <Icon
                      style={{
                        color: isActive ? '#4f46e5' : '#94a3b8',
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {sec.title}
                    </span>
                  </button>
                )
              })}
            </nav>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <Link
                to="/privacy"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#4f46e5',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginBottom: '8px',
                }}
              >
                &rarr; Read Privacy Notice
              </Link>
              <Link
                to="/privacy-choices"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#4f46e5',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                &rarr; Ads Privacy Choices
              </Link>
            </div>
          </div>

          {/* Detailed Legal Content Cards */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Section 1 */}
            <div
              id="acceptance"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaShieldAlt />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  1. Acceptance of Terms & Eligibility
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                By accessing, browsing, registering on, or purchasing through the Cartiva website,
                mobile applications, or associated API services, you expressly agree to be bound by
                these Conditions of Use and all policies incorporated herein by reference.
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                You must be at least 18 years of age or the legal age of majority in your
                jurisdiction to create an account, purchase products, or register as a merchant. If
                you represent a legal entity, you certify that you possess lawful authorization to
                bind said entity to these terms.
              </p>
            </div>

            {/* Section 2 */}
            <div
              id="accounts"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaUserLock />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  2. Account Security, Passwords & Integrity
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                You are solely responsible for maintaining the confidentiality of your login
                credentials and for restricting access to your computer, tablet, or mobile phone.
                You agree to accept liability for all activities that occur under your registered
                email account.
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  borderLeft: '4px solid #4f46e5',
                  padding: '14px 18px',
                  borderRadius: '4px',
                  margin: '14px 0',
                  fontSize: '14px',
                  color: '#475569',
                }}
              >
                <strong>Security Alert:</strong> If you suspect unauthorized access or security
                breach, you must immediately change your password and notify{' '}
                <a href="mailto:security@cartiva.com" style={{ color: '#4f46e5', fontWeight: 600 }}>
                  security@cartiva.com
                </a>
                .
              </div>
            </div>

            {/* Section 3 */}
            <div
              id="marketplace"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaStore />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  3. Multi-Vendor Marketplace Operations
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Cartiva operates as a curated multi-vendor marketplace platform. Products displayed
                on the platform are listed and fulfilled by either Cartiva or independent
                third-party verified merchants ("Sellers").
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                While Cartiva enforces strict quality control, atomic inventory safeguards, and
                anti-counterfeiting verification, individual merchants are responsible for the
                description, compliance, and warranty of their merchant-fulfilled goods. Cartiva
                guarantees 100% buyer protection through our escrow-backed payment settlement model.
              </p>
            </div>

            {/* Section 4 */}
            <div
              id="pricing"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaCreditCard />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  4. Pricing, Taxes & Atomic Inventory Reservation
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                All prices are displayed in U.S. Dollars (USD) or the localized currency selected in
                your header currency switcher. Applicable sales taxes, VAT, and shipping tariffs are
                calculated dynamically during checkout based on your delivery destination.
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                <strong>Atomic Inventory Guarantee:</strong> When you place an order, our
                distributed inventory engine atomically decrements stock with strict concurrency
                guards. If an item sells out simultaneously before transaction authorization, your
                payment is automatically cancelled and zero charges are posted.
              </p>
            </div>

            {/* Section 5 */}
            <div
              id="shipping"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaTruck />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  5. Shipping, Dispatch & Risk of Loss
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Shipment tracking events and estimated delivery windows are provided in real-time
                within your{' '}
                <Link to="/orders" style={{ color: '#4f46e5', fontWeight: 600 }}>
                  Orders Dashboard
                </Link>
                . All purchases made from Cartiva are made pursuant to a shipment contract with
                certified commercial freight and postal carriers.
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                Risk of loss and title for items pass to you upon delivery confirmation by the
                carrier at the designated shipping address.
              </p>
            </div>

            {/* Section 6 */}
            <div
              id="returns"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaUndo />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  6. 30-Day Return Policy & Refund Guarantees
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Customers may request returns for eligible items within 30 days of confirmed
                delivery via our self-service{' '}
                <Link to="/returns" style={{ color: '#4f46e5', fontWeight: 600 }}>
                  Returns Portal
                </Link>
                .
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                Upon warehouse inspection or merchant receipt verification, refunds are returned to
                your original payment method (e.g. Stripe, Paystack) within 3–5 business days or
                credited immediately to your Cartiva Wallet Balance.
              </p>
            </div>

            {/* Section 7 */}
            <div
              id="ip"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaRegCheckCircle />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  7. Intellectual Property & Prohibited Activities
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                All proprietary software, logos, UI designs, codebases, microservice APIs, and text
                are the exclusive property of Cartiva, Inc. or its licensors and are protected under
                international copyright, trademark, and trade secret laws.
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                You agree not to scrape, reverse-engineer, inject automated bot traffic, probe
                security vulnerabilities, or circumvent rate-limiting firewalls.
              </p>
            </div>

            {/* Section 8 & 9 & 10 */}
            <div
              id="disputes"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  <FaBalanceScale />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  8. Binding Arbitration & Dispute Resolution
                </h2>
              </div>
              <p
                style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 12px', fontSize: '15px' }}
              >
                Any controversy or dispute arising out of or relating to these Conditions of Use or
                your purchase on Cartiva shall be resolved through confidential, binding arbitration
                administered by the American Arbitration Association (AAA) under its Commercial
                Arbitration Rules.
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                You and Cartiva agree that each may bring claims against the other only in your or
                its individual capacity and not as a plaintiff or class member in any purported
                class action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConditionsOfUsePage
