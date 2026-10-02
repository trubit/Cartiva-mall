import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterVendor } from '../../../hooks/useVendors.js'
import { HUMAN_IMAGES } from '../../../constants/images.js'

type BusinessType = 'individual' | 'business' | 'corporation'

const STEPS = ['Business Info', 'Display Name', 'Review']

export default function VendorRegistration() {
  const navigate = useNavigate()
  const register = useRegisterVendor()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    businessName: '',
    businessType: 'individual' as BusinessType,
    displayName: '',
  })
  const [error, setError] = useState('')

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    setError('')
    try {
      await register.mutateAsync(form)
      navigate('/seller/verification')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '32px',
          maxWidth: 960,
          width: '100%',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-neutral-200)',
            borderRadius: 16,
            padding: '2.5rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              margin: '0 0 4px',
            }}
          >
            Become a Vendor
          </h1>
          <p
            style={{ fontSize: '0.85rem', color: 'var(--color-neutral-400)', margin: '0 0 1.5rem' }}
          >
            Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]}
          </p>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 999,
                  background:
                    i <= step ? 'var(--color-primary, #007185)' : 'var(--color-neutral-200)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          {/* Step 0: Business Info */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="sl-form-label">Business Name *</label>
                <input
                  className="form-control"
                  value={form.businessName}
                  onChange={(e) => update('businessName', e.target.value)}
                  placeholder="e.g. Truson Electronics"
                />
              </div>
              <div>
                <label className="sl-form-label">Business Type *</label>
                <select
                  className="form-select"
                  value={form.businessType}
                  onChange={(e) => update('businessType', e.target.value as BusinessType)}
                >
                  <option value="individual">Individual / Sole Trader</option>
                  <option value="business">Business</option>
                  <option value="corporation">Corporation</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Display Name */}
          {step === 1 && (
            <div>
              <label className="sl-form-label">Store Display Name *</label>
              <input
                className="form-control"
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                placeholder="e.g. Truson Store"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400)', marginTop: 6 }}>
                This is what customers will see on your store page.
              </p>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div>
              <div
                style={{
                  background: 'var(--color-neutral-50, #f8f9fa)',
                  borderRadius: 10,
                  padding: '1rem 1.25rem',
                  marginBottom: 12,
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>
                  <strong>Business Name:</strong> {form.businessName}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  <strong>Business Type:</strong> {form.businessType}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  <strong>Display Name:</strong> {form.displayName}
                </p>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-neutral-400)' }}>
                Your application will be reviewed by our team. You will receive a notification once
                a decision is made.
              </p>
            </div>
          )}

          {error && (
            <div className="sl-alert sl-alert--error" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: '2rem' }}>
            {step > 0 && (
              <button onClick={prev} className="sl-btn sl-btn--outline" style={{ flex: 1 }}>
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={step === 0 ? !form.businessName : !form.displayName}
                className="sl-btn sl-btn--primary"
                style={{ flex: 1 }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={register.isPending}
                className="sl-btn sl-btn--primary"
                style={{ flex: 1 }}
              >
                {register.isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        {/* Right Showcase Column (Desktop / Tablet) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 16,
            padding: '2rem',
            color: '#ffffff',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div>
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: '1.25rem',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <img
                src={HUMAN_IMAGES.vendorRegistrationMerchant.url}
                alt={HUMAN_IMAGES.vendorRegistrationMerchant.alt}
                loading="lazy"
                width={HUMAN_IMAGES.vendorRegistrationMerchant.width}
                height={HUMAN_IMAGES.vendorRegistrationMerchant.height}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  aspectRatio: HUMAN_IMAGES.vendorRegistrationMerchant.aspectRatio,
                  objectFit: 'cover',
                }}
              />
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                borderRadius: 10,
                padding: '1rem 1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#e2e8f0',
                  lineHeight: 1.6,
                  margin: '0 0 8px',
                  fontStyle: 'italic',
                }}
              >
                “Selling on Cartiva gave our business instant nationwide distribution. Orders arrive
                reliably and customer escrow payouts clear into our bank account with zero hassle.”
              </p>
              <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600 }}>
                &mdash; Verified Cartiva Merchant Partner
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span>Instant Escrow Payouts</span>
            <span>Zero Listing Tariffs</span>
            <span>24/7 Vendor Support</span>
          </div>
        </div>
      </div>
    </div>
  )
}
