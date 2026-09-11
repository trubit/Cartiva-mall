import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaWallet, FaBolt, FaShieldAlt, FaHistory, FaGift, FaSyncAlt } from 'react-icons/fa'
import { useCurrency } from '../../hooks/useCurrency.js'

export const ReloadBalancePage: FC = () => {
  const { formatPrice } = useCurrency()
  const [selectedAmount, setSelectedAmount] = useState<number>(100)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [autoReload, setAutoReload] = useState<boolean>(false)
  const [currentBalance] = useState<number>(45.5)

  const activeAmount = customAmount ? Math.max(5, Number(customAmount) || 0) : selectedAmount
  const bonusReward = activeAmount >= 100 ? activeAmount * 0.02 : 0
  const finalNewBalance = currentBalance + activeAmount + bonusReward

  const presets = [25, 50, 100, 200, 500]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '48px 36px',
            color: '#ffffff',
            marginBottom: '36px',
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
              marginBottom: '16px',
            }}
          >
            <FaWallet /> Cartiva Wallet & Digital Balance
          </div>
          <h1
            style={{
              fontSize: '38px',
              fontWeight: 800,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Instant 1-Click Reload & Balance Rewards
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#d1fae5',
              maxWidth: '720px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Enjoy lightning-fast checkout without entering credit card details every time. Earn 2%
            instant cashback bonus when you reload $100 or more.
          </p>
        </div>

        {/* Grid: Wallet Card & Reload Form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '32px',
            marginBottom: '40px',
          }}
        >
          {/* Left: Reload Options Form */}
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
              Select Amount to Reload
            </h2>

            {/* Presets Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              {presets.map((amt) => {
                const isSelected = selectedAmount === amt && !customAmount
                return (
                  <button
                    key={amt}
                    onClick={() => {
                      setSelectedAmount(amt)
                      setCustomAmount('')
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: isSelected ? '#ecfdf5' : '#f8fafc',
                      color: isSelected ? '#059669' : '#1e293b',
                      fontSize: '18px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    ${amt}
                  </button>
                )
              })}
            </div>

            {/* Custom Amount */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Or Enter Custom Amount ($5 – $2,000)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '12px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#64748b',
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="5"
                  max="2000"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 32px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Auto-Reload Toggle */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '28px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaSyncAlt style={{ color: '#059669', fontSize: '16px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      Enable Auto-Reload
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Auto-recharge when balance dips below $10
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoReload}
                  onChange={(e) => setAutoReload(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: '#059669',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* CTA Button */}
            <Link
              to="/payment"
              style={{
                background: '#059669',
                color: '#ffffff',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 800,
                textAlign: 'center',
                display: 'block',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.4)',
              }}
            >
              Proceed to Reload ${activeAmount}
            </Link>
          </div>

          {/* Right: Live Balance Summary & Wallet Card Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Wallet Card Visual */}
            <div
              style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%)',
                borderRadius: '24px',
                padding: '32px',
                color: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '240px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px' }}>
                  CARTIVA WALLET
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#a7f3d0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Projected New Balance
                </div>
                <div
                  style={{
                    fontSize: '40px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                  }}
                >
                  {formatPrice(finalNewBalance)}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                  color: '#d1fae5',
                }}
              >
                <span>Current: {formatPrice(currentBalance)}</span>
                <span>+ Reload: {formatPrice(activeAmount)}</span>
              </div>
            </div>

            {/* Bonus Details */}
            {bonusReward > 0 && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <FaGift style={{ color: '#059669', fontSize: '24px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#065f46' }}>
                    +{formatPrice(bonusReward)} Instant Cashback Bonus Included!
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    2% reward earned for reloading {formatPrice(100)} or higher.
                  </div>
                </div>
              </div>
            )}

            {/* Guarantee Cards */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                display: 'grid',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#334155',
                }}
              >
                <FaBolt style={{ color: '#059669' }} /> <strong>Instant Availability:</strong> Funds
                available immediately upon transaction.
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#334155',
                }}
              >
                <FaHistory style={{ color: '#059669' }} /> <strong>Never Expires:</strong> Zero
                maintenance fees or dormancy deductions.
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#334155',
                }}
              >
                <FaShieldAlt style={{ color: '#059669' }} /> <strong>FDIC Escrow:</strong> 100%
                principal protection with banking partners.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReloadBalancePage
