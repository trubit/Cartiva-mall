import { Link } from 'react-router-dom'
import { FiMail, FiPhone, FiCalendar, FiGlobe, FiUser, FiShield } from 'react-icons/fi'
import { MdVerified } from 'react-icons/md'
import { useSellerKycStatus } from '../../../hooks/useSellerKyc.js'
import type { IUser } from '../../../../shared/types/user.types.js'

interface Props {
  user: IUser
}

const fmt = (val?: string) => val || <span className="profile-info-value empty">Not set</span>

const fmtDate = (iso?: string) => {
  if (!iso) return <span className="profile-info-value empty">Not set</span>
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
}

export default function ProfileCard({ user }: Props) {
  const { data: kycData } = useSellerKycStatus()
  const kycStatus = kycData?.kycStatus || 'NOT_STARTED'
  const isVerified = kycData?.isVerified || false

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2 className="profile-section-title">
          <FiUser /> Personal Information
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {user.emailVerified ? (
            <span className="verified-badge verified-badge--yes">
              <MdVerified /> Email Verified
            </span>
          ) : (
            <span className="verified-badge verified-badge--no">Email Unverified</span>
          )}

          {isVerified ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <FiShield /> KYC Verified Seller
            </span>
          ) : kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING' ? (
            <Link
              to="/seller/kyc"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <FiShield /> KYC Under Review
            </Link>
          ) : kycStatus === 'REQUIRES_ACTION' ? (
            <Link
              to="/seller/kyc"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #ffedd5',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <FiShield /> KYC Action Required
            </Link>
          ) : null}
        </div>
      </div>

      {user.bio && (
        <p
          style={{
            fontSize: '.9rem',
            color: '#444',
            lineHeight: 1.6,
            marginBottom: '1.25rem',
            padding: '.75rem',
            background: '#fafafa',
            borderRadius: 8,
            borderLeft: '3px solid #FF9900',
          }}
        >
          {user.bio}
        </p>
      )}

      <div className="profile-info-grid">
        <div className="profile-info-item">
          <span className="profile-info-label">First Name</span>
          <span className="profile-info-value">{fmt(user.firstName)}</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">Last Name</span>
          <span className="profile-info-value">{fmt(user.lastName)}</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">Username</span>
          <span className="profile-info-value">@{user.username}</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">Gender</span>
          <span className="profile-info-value">
            {user.gender ? (
              GENDER_LABEL[user.gender]
            ) : (
              <span className="profile-info-value empty">Not set</span>
            )}
          </span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">
            <FiMail style={{ verticalAlign: 'middle' }} /> Email
          </span>
          <span className="profile-info-value">{fmt(user.email)}</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">
            <FiPhone style={{ verticalAlign: 'middle' }} /> Phone
          </span>
          <span className="profile-info-value">{fmt(user.phoneNumber)}</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">
            <FiCalendar style={{ verticalAlign: 'middle' }} /> Date of Birth
          </span>
          <span className="profile-info-value">{fmtDate(user.dateOfBirth)}</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">
            <FiGlobe style={{ verticalAlign: 'middle' }} /> Language
          </span>
          <span className="profile-info-value">{user.language?.toUpperCase() ?? 'EN'}</span>
        </div>
      </div>
    </div>
  )
}
