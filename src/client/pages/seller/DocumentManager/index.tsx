import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useMyVendorDetail,
  useVendorDocuments,
  useUploadDocument,
} from '../../../hooks/useVendors.js'
import type { DocumentType, IVendorDocument } from '../../../../shared/types/vendors.types.js'

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'id_card', label: 'ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'business_registration', label: 'Business Registration' },
  { value: 'tax_certificate', label: 'Tax Certificate' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'other', label: 'Other' },
]

const STATUS_PILL: Record<string, string> = {
  pending: 'status-pill status-pill--pending',
  approved: 'status-pill status-pill--active',
  rejected: 'status-pill status-pill--blocked',
  expired: 'status-pill',
}

function DocRow({ doc }: { doc: IVendorDocument }) {
  const label = DOC_TYPES.find((d) => d.value === doc.type)?.label ?? doc.type
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--color-neutral-200)',
      }}
    >
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400)', margin: '2px 0 0' }}>
          {doc.fileName} &middot; {new Date(doc.createdAt).toLocaleDateString()}
        </p>
        {doc.rejectionReason && (
          <p style={{ fontSize: '0.75rem', color: '#e53e3e', margin: '2px 0 0' }}>
            Rejected: {doc.rejectionReason}
          </p>
        )}
      </div>
      <span className={STATUS_PILL[doc.status] ?? 'status-pill'}>
        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
      </span>
    </div>
  )
}

export default function DocumentManager() {
  const { data: vendorData, isLoading: vendorLoading } = useMyVendorDetail()
  const vendorId = vendorData?.vendor ? String(vendorData.vendor._id) : ''
  const { data: docs = [] } = useVendorDocuments(vendorId)
  const upload = useUploadDocument(vendorId)

  const [form, setForm] = useState({ type: 'id_card' as DocumentType, fileUrl: '', fileName: '' })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    try {
      await upload.mutateAsync(form)
      setSuccess(true)
      setForm({ type: 'id_card', fileUrl: '', fileName: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  if (vendorLoading) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Document Manager</h1>
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Document Manager</h1>
        </div>
        <div className="sl-empty">
          <p>No vendor profile found.</p>
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
          <h1 className="sl-page-title">Document Manager</h1>
          <p className="sl-page-subtitle">Upload and manage your KYC/KYB documents</p>
        </div>
      </div>

      <div className="sl-settings-section">
        <div className="sl-settings-section__head">
          <h3>Upload Document</h3>
        </div>
        <div className="sl-settings-section__body">
          <form onSubmit={handleSubmit} className="seller-form">
            <div className="seller-form__section">
              <div className="seller-form__grid">
                <div className="seller-form__field">
                  <label className="sl-form-label">Document Type</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value as DocumentType }))
                    }
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="seller-form__field">
                  <label className="sl-form-label">File Name</label>
                  <input
                    className="form-control"
                    value={form.fileName}
                    onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))}
                    placeholder="e.g. passport.pdf"
                    required
                  />
                </div>
                <div className="seller-form__field seller-form__field--full">
                  <label className="sl-form-label">File URL</label>
                  <input
                    className="form-control"
                    value={form.fileUrl}
                    onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                    placeholder="https://..."
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="sl-alert sl-alert--error" style={{ marginTop: 12 }}>
                  {error}
                </div>
              )}
              {success && (
                <div className="sl-alert sl-alert--info" style={{ marginTop: 12 }}>
                  Document uploaded successfully!
                </div>
              )}
            </div>
            <div className="seller-form__actions">
              <button type="submit" className="sl-btn sl-btn--primary" disabled={upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="sl-settings-section" style={{ marginTop: 24 }}>
        <div className="sl-settings-section__head">
          <h3>Your Documents ({docs.length})</h3>
        </div>
        <div className="sl-settings-section__body">
          {docs.length === 0 ? (
            <div className="sl-empty">
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            docs.map((doc) => <DocRow key={doc._id} doc={doc} />)
          )}
        </div>
      </div>
    </div>
  )
}
