import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMyVendorDetail, useUpsertStorefront } from '../../../hooks/useVendors.js'
import type { IVendorStorefront } from '../../../../shared/types/vendors.types.js'

export default function StorefrontBuilder() {
  const { data, isLoading } = useMyVendorDetail()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
    banner: '',
    isPublic: false,
    policies: { returns: '', shipping: '', payment: '' },
    theme: { primaryColor: '#6366f1', secondaryColor: '#8b5cf6' },
  })

  const vendorId = data?.vendor ? String(data.vendor._id) : ''
  const upsert = useUpsertStorefront(vendorId)

  useEffect(() => {
    const sf = data?.storefront as IVendorStorefront | null
    if (sf) {
      setForm({
        name: sf.name ?? '',
        slug: sf.slug ?? '',
        description: sf.description ?? '',
        logo: sf.logo ?? '',
        banner: sf.banner ?? '',
        isPublic: sf.isPublic ?? false,
        policies: {
          returns: sf.policies?.returns ?? '',
          shipping: sf.policies?.shipping ?? '',
          payment: sf.policies?.payment ?? '',
        },
        theme: {
          primaryColor: sf.theme?.primaryColor ?? '#6366f1',
          secondaryColor: sf.theme?.secondaryColor ?? '#8b5cf6',
        },
      })
    }
  }, [data?.storefront])

  const toSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      await upsert.mutateAsync(form)
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save storefront')
    }
  }

  if (isLoading) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Storefront Builder</h1>
        </div>
        <div className="skeleton" style={{ height: 240, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Storefront Builder</h1>
        </div>
        <div className="sl-empty">
          <p>You need a vendor profile before building a storefront.</p>
          <Link to="/seller/register" className="sl-btn sl-btn--primary" style={{ marginTop: 12 }}>
            Register as a Vendor
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container section sl-page">
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Storefront Builder</h1>
          <p className="sl-page-subtitle">Customise how customers see your store</p>
        </div>
      </div>

      {error && <div className="sl-alert sl-alert--error" style={{ marginBottom: 20 }}>{error}</div>}
      {saved && <div className="sl-alert sl-alert--info" style={{ marginBottom: 20 }}>Storefront saved successfully!</div>}

      <form onSubmit={submit} className="seller-form">
        <div className="seller-form__section">
          <h3 className="seller-form__section-title">Basic Info</h3>
          <div className="seller-form__grid">
            <div className="seller-form__field">
              <label className="sl-form-label">Store Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => {
                  update('name', e.target.value)
                  if (!data?.storefront) update('slug', toSlug(e.target.value))
                }}
                required
              />
            </div>
            <div className="seller-form__field">
              <label className="sl-form-label">Slug (URL) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>
                  /store/
                </span>
                <input
                  className="form-control"
                  value={form.slug}
                  onChange={(e) => update('slug', toSlug(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="seller-form__field seller-form__field--full">
              <label className="sl-form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="seller-form__section">
          <h3 className="seller-form__section-title">Media</h3>
          <div className="seller-form__grid">
            <div className="seller-form__field">
              <label className="sl-form-label">Logo URL</label>
              <input
                className="form-control"
                value={form.logo}
                onChange={(e) => update('logo', e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="seller-form__field">
              <label className="sl-form-label">Banner URL</label>
              <input
                className="form-control"
                value={form.banner}
                onChange={(e) => update('banner', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
        </div>

        <div className="seller-form__section">
          <h3 className="seller-form__section-title">Store Policies</h3>
          <div className="seller-form__grid">
            {(['returns', 'shipping', 'payment'] as const).map((key) => (
              <div key={key} className="seller-form__field seller-form__field--full">
                <label className="sl-form-label" style={{ textTransform: 'capitalize' }}>
                  {key} Policy
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.policies[key]}
                  onChange={(e) => update('policies', { ...form.policies, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="seller-form__section">
          <h3 className="seller-form__section-title">Theme & Visibility</h3>
          <div className="seller-form__grid">
            {(['primaryColor', 'secondaryColor'] as const).map((key) => (
              <div key={key} className="seller-form__field">
                <label className="sl-form-label">
                  {key === 'primaryColor' ? 'Primary Colour' : 'Secondary Colour'}
                </label>
                <input
                  type="color"
                  value={form.theme[key]}
                  onChange={(e) => update('theme', { ...form.theme, [key]: e.target.value })}
                  style={{ width: 56, height: 36, padding: 2, borderRadius: 6, cursor: 'pointer' }}
                />
              </div>
            ))}
            <div className="seller-form__field seller-form__field--checkbox seller-form__field--full">
              <label className="seller-form__checkbox-label">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => update('isPublic', e.target.checked)}
                />
                Make storefront public (visible to customers)
              </label>
            </div>
          </div>
        </div>

        <div className="seller-form__actions">
          <button type="submit" className="sl-btn sl-btn--primary" disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : 'Save Storefront'}
          </button>
        </div>
      </form>
    </div>
  )
}
