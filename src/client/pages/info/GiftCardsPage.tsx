import type { FC } from 'react'
import { useState } from 'react'
import {
  FaGift,
  FaQrcode,
  FaCheckCircle,
  FaBirthdayCake,
  FaHeart,
  FaGlassCheers,
  FaSmile,
  FaArrowRight,
} from 'react-icons/fa'

export const GiftCardsPage: FC = () => {
  const [theme, setTheme] = useState<'celebration' | 'birthday' | 'thankyou' | 'love'>(
    'celebration',
  )
  const [denomination, setDenomination] = useState<number>(50)
  const [recipientEmail, setRecipientEmail] = useState<string>('')
  const [customMsg, setCustomMsg] = useState<string>('Hope you enjoy this Cartiva gift card!')
  const [redeemCode, setRedeemCode] = useState<string>('')
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null)
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null)

  const themes = [
    {
      id: 'celebration',
      label: 'Celebration',
      icon: FaGlassCheers,
      grad: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    },
    {
      id: 'birthday',
      label: 'Birthday',
      icon: FaBirthdayCake,
      grad: 'linear-gradient(135deg, #db2777 0%, #f43f5e 100%)',
    },
    {
      id: 'thankyou',
      label: 'Thank You',
      icon: FaSmile,
      grad: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    },
    {
      id: 'love',
      label: 'With Love',
      icon: FaHeart,
      grad: 'linear-gradient(135deg, #dc2626 0%, #e11d48 100%)',
    },
  ]

  const amounts = [25, 50, 100, 200, 500]

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemCode.trim()) return
    setRedeemMsg(
      `Claim code "${redeemCode.toUpperCase()}" validated! $${denomination}.00 has been credited to your Cartiva Wallet.`,
    )
    setRedeemCode('')
  }

  const currentTheme = themes.find((t) => t.id === theme) || themes[0]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #701a75 0%, #a21caf 50%, #1e1b4b 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(162, 28, 175, 0.25)',
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
            <FaGift /> The Perfect Choice for Everyone
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
            Cartiva Digital eGift Cards
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#fae8ff',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Send instant gifts with personalized designs and messages. Redeemable on millions of
            trending products across the Cartiva multi-vendor marketplace.
          </p>
        </div>

        {/* Interactive Card Customizer Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Card Preview */}
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '12px',
              }}
            >
              Live eGift Card Preview
            </div>
            <div
              style={{
                width: '100%',
                height: '240px',
                borderRadius: '24px',
                background: currentTheme.grad,
                padding: '28px',
                color: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px' }}>
                  CARTIVA
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  eGIFT CARD
                </div>
              </div>

              <div>
                <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  ${denomination}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.9)',
                    fontStyle: 'italic',
                    marginTop: '4px',
                  }}
                >
                  &ldquo;{customMsg || 'A special gift for you!'}&rdquo;
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                <span>Redeemable on all products</span>
                <span>No Expiration Date</span>
              </div>
            </div>

            {/* Redeem Code Box */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              }}
            >
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FaQrcode style={{ color: '#a21caf' }} /> Have a Gift Card Claim Code?
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
                Enter your 16-character alphanumeric claim code to instantly apply funds to your
                Cartiva Wallet.
              </p>

              {redeemMsg && (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '16px',
                  }}
                >
                  <FaCheckCircle style={{ marginRight: '6px' }} /> {redeemMsg}
                </div>
              )}

              <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. CART-9924-XK82"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#a21caf',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Apply to Balance
                </button>
              </form>
            </div>
          </div>

          {/* Customization Form */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>
              Personalize Your Gift Card
            </h2>

            {/* Select Theme */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '8px',
                }}
              >
                1. Select Design Theme
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {themes.map((t) => {
                  const Icon = t.icon
                  const isSelected = theme === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #a21caf' : '1px solid #cbd5e1',
                        background: isSelected ? '#fdf4ff' : '#f8fafc',
                        color: isSelected ? '#a21caf' : '#334155',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon /> {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Select Amount */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '8px',
                }}
              >
                2. Select Denomination ($)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {amounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDenomination(amt)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: denomination === amt ? '2px solid #a21caf' : '1px solid #cbd5e1',
                      background: denomination === amt ? '#fdf4ff' : '#f8fafc',
                      color: denomination === amt ? '#a21caf' : '#334155',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Details */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                3. Recipient Email
              </label>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Custom Message */}
            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                4. Personal Note
              </label>
              <textarea
                rows={2}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  resize: 'none',
                }}
              />
            </div>

            {purchaseNotice && (
              <div
                style={{
                  background: '#fdf4ff',
                  border: '1px solid #f0abfc',
                  color: '#86198f',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                <strong>eGift Configuration:</strong> {purchaseNotice}
              </div>
            )}

            {/* Buy Action */}
            <button
              onClick={() =>
                setPurchaseNotice(
                  `$${denomination} digital gift card prepared for ${recipientEmail || 'your recipient'}. Online checkout authorization is ready.`,
                )
              }
              style={{
                width: '100%',
                background: '#a21caf',
                color: '#ffffff',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(162, 28, 175, 0.4)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Purchase ${denomination} eGift Card <FaArrowRight style={{ fontSize: '12px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GiftCardsPage
