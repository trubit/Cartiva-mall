import { Link } from 'react-router-dom'
import { useMyVendorDetail, useSubmitVerification } from '../../../hooks/useVendors.js'
import type {
  VerificationStepName,
  IVerificationStep,
} from '../../../../shared/types/vendors.types.js'

const STEP_LABELS: Record<VerificationStepName, string> = {
  identity: 'Identity Verification',
  business: 'Business Verification',
  banking: 'Banking Details',
  address: 'Address Verification',
  final: 'Final Review',
}

const STATUS_PILL: Record<string, string> = {
  pending: 'status-pill',
  submitted: 'status-pill status-pill--pending',
  approved: 'status-pill status-pill--active',
  rejected: 'status-pill status-pill--blocked',
}

const OVERALL_COLOR: Record<string, string> = {
  unverified: 'var(--color-neutral-400)',
  in_progress: '#d97706',
  verified: '#16a34a',
  rejected: '#dc2626',
}

function StepRow({ s, vendorId }: { s: IVerificationStep; vendorId: string }) {
  const submit = useSubmitVerification(vendorId)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid var(--color-neutral-200)',
      }}
    >
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{STEP_LABELS[s.step]}</p>
        {s.submittedAt && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400)', margin: '2px 0 0' }}>
            Submitted {new Date(s.submittedAt).toLocaleDateString()}
          </p>
        )}
        {s.notes && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', margin: '2px 0 0' }}>
            {s.notes}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={STATUS_PILL[s.status] ?? 'status-pill'}>
          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
        </span>
        {s.status === 'pending' && (
          <button
            onClick={() => submit.mutate(s.step)}
            disabled={submit.isPending}
            className="sl-btn sl-btn--outline"
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
          >
            Submit
          </button>
        )}
      </div>
    </div>
  )
}

export default function VendorVerification() {
  const { data, isLoading } = useMyVendorDetail()

  if (isLoading) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Verification Status</h1>
        </div>
        <div className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
      </div>
    )
  }

  if (!data?.vendor) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Verification Status</h1>
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

  const { vendor, verification } = data
  const overallStatus = verification?.overallStatus ?? 'unverified'
  const overallLabel = overallStatus.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  const vendorStatusPill =
    vendor.status === 'active'
      ? 'status-pill status-pill--active'
      : vendor.status === 'pending'
        ? 'status-pill status-pill--pending'
        : 'status-pill status-pill--blocked'

  return (
    <div className="container section sl-page">
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Verification Status</h1>
          <p className="sl-page-subtitle">{vendor.businessName}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={vendorStatusPill} style={{ textTransform: 'capitalize' }}>
            {vendor.status}
          </span>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: OVERALL_COLOR[overallStatus] ?? 'inherit',
            }}
          >
            {overallLabel}
          </span>
        </div>
      </div>

      {vendor.rejectionReason && (
        <div className="sl-alert sl-alert--error" style={{ marginBottom: 20 }}>
          <strong>Rejection Reason:</strong> {vendor.rejectionReason}
        </div>
      )}

      {vendor.suspensionReason && (
        <div className="sl-alert sl-alert--warn" style={{ marginBottom: 20 }}>
          <strong>Suspension Reason:</strong> {vendor.suspensionReason}
        </div>
      )}

      <div className="sl-settings-section">
        <div className="sl-settings-section__head">
          <h3>Verification Steps</h3>
        </div>
        <div className="sl-settings-section__body">
          {verification ? (
            verification.steps.map((s) => (
              <StepRow key={s.step} s={s} vendorId={String(vendor._id)} />
            ))
          ) : (
            <div className="sl-empty">
              <p>Verification record not yet created. Submit a step to begin.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <Link to="/seller/documents" className="sl-btn sl-btn--outline">
          Manage Documents
        </Link>
        <Link to="/seller/storefront" className="sl-btn sl-btn--outline">
          Build Storefront
        </Link>
      </div>
    </div>
  )
}
