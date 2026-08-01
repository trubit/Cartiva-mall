import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyVendorDetail, useUpdateVendorProfile } from '../../../hooks/useVendors.js'

const STEPS = [
  { key: 'profile', label: 'Business Profile', desc: 'Tell customers about your business' },
  { key: 'address', label: 'Address Details', desc: 'Where are you located?' },
  { key: 'contact', label: 'Contact & Social', desc: 'How can customers reach you?' },
  { key: 'bank', label: 'Banking Details', desc: 'For receiving payouts' },
  { key: 'done', label: 'Complete', desc: "You're all set!" },
]

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="sl-form-label">{label}</label>
      {children}
    </div>
  )
}

export default function VendorOnboarding() {
  const navigate = useNavigate()
  const { data } = useMyVendorDetail()
  const vendorId = data?.vendor ? String(data.vendor._id) : ''
  const update = useUpdateVendorProfile(vendorId)

  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({ bio: '', website: '' })
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  })
  const [contact, setContact] = useState({ phone: '', twitter: '', instagram: '' })

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const saveStep = async () => {
    setError('')
    try {
      if (step === 0) await update.mutateAsync({ bio: profile.bio, website: profile.website })
      if (step === 1) await update.mutateAsync({ address })
      if (step === 2)
        await update.mutateAsync({
          phone: contact.phone,
          socialLinks: { twitter: contact.twitter, instagram: contact.instagram },
        })
      next()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-neutral-200)',
          borderRadius: 16,
          padding: '2.5rem',
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}
      >
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 999,
                background: i <= step ? 'var(--color-primary, #007185)' : 'var(--color-neutral-200)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
          {STEPS[step].label}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-400)', margin: '0 0 1.5rem' }}>
          {STEPS[step].desc}
        </p>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Bio">
              <textarea
                className="form-control"
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Describe your business…"
              />
            </FormField>
            <FormField label="Website">
              <input
                className="form-control"
                value={profile.website}
                onChange={(e) => setProfile((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://…"
              />
            </FormField>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(['street', 'city', 'state', 'country', 'postalCode'] as const).map((key) => (
              <FormField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                <input
                  className="form-control"
                  value={address[key]}
                  onChange={(e) => setAddress((f) => ({ ...f, [key]: e.target.value }))}
                />
              </FormField>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Phone">
              <input
                className="form-control"
                value={contact.phone}
                onChange={(e) => setContact((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </FormField>
            <FormField label="Twitter">
              <input
                className="form-control"
                value={contact.twitter}
                onChange={(e) => setContact((f) => ({ ...f, twitter: e.target.value }))}
                placeholder="@handle"
              />
            </FormField>
            <FormField label="Instagram">
              <input
                className="form-control"
                value={contact.instagram}
                onChange={(e) => setContact((f) => ({ ...f, instagram: e.target.value }))}
                placeholder="@handle"
              />
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div
            style={{
              background: 'var(--color-neutral-50, #f8f9fa)',
              borderRadius: 10,
              padding: '1rem 1.25rem',
              fontSize: '0.875rem',
              color: 'var(--color-neutral-500)',
            }}
          >
            <p style={{ margin: 0 }}>
              Banking details are managed securely through your profile settings.
            </p>
            <p style={{ margin: '8px 0 0' }}>
              Go to <strong>Profile &rarr; Banking</strong> to add your bank account for payouts.
            </p>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>
              Onboarding complete!
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-400)', margin: 0 }}>
              Upload your verification documents to get approved faster.
            </p>
          </div>
        )}

        {error && (
          <div className="sl-alert sl-alert--error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: '2rem' }}>
          {step === STEPS.length - 1 ? (
            <>
              <button
                onClick={() => navigate('/seller/documents')}
                className="sl-btn sl-btn--primary"
              >
                Upload Documents
              </button>
              <button onClick={() => navigate('/seller')} className="sl-btn sl-btn--outline">
                Go to Dashboard
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              {step > 0 && (
                <button onClick={prev} className="sl-btn sl-btn--outline" style={{ flex: 1 }}>
                  Back
                </button>
              )}
              {step < STEPS.length - 2 ? (
                <button
                  onClick={saveStep}
                  disabled={update.isPending}
                  className="sl-btn sl-btn--primary"
                  style={{ flex: 1 }}
                >
                  {update.isPending ? 'Saving…' : 'Save & Continue'}
                </button>
              ) : (
                <button onClick={next} className="sl-btn sl-btn--primary" style={{ flex: 1 }}>
                  Continue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
