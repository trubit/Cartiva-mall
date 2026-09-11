import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiArrowRight,
  FiArrowLeft,
  FiShield,
  FiShoppingBag,
  FiUser,
  FiCreditCard,
  FiFileText,
  FiUpload,
} from 'react-icons/fi'
import {
  useSellerKycStatus,
  useSubmitSellerKyc,
  useCreateSellerStore,
  useUploadStoreLogo,
  useUploadKycDocument,
} from '../../../hooks/useSellerKyc.js'
import { sellerService } from '../../../services/sellerService.js'

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem' }}>
      <label
        style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700, #374151)' }}
      >
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{hint}</span>}
      {children}
    </div>
  )
}

export default function VendorOnboarding() {
  const navigate = useNavigate()
  const { data: kycStatusData, isLoading } = useSellerKycStatus()
  const submitKycMutation = useSubmitSellerKyc()
  const createStoreMutation = useCreateSellerStore()
  const uploadLogoMutation = useUploadStoreLogo()
  const uploadKycDocMutation = useUploadKycDocument()

  // Stepper state
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [resolvingBank, setResolvingBank] = useState(false)
  const [resolvedAccountName, setResolvedAccountName] = useState('')

  // Form states
  const [businessType, setBusinessType] = useState<
    'individual' | 'registered_business' | 'company'
  >('individual')
  const [legalName, setLegalName] = useState('')
  const [idType, setIdType] = useState<
    'bvn' | 'nin' | 'passport' | 'drivers_license' | 'voters_card'
  >('nin')
  const [idNumber, setIdNumber] = useState('')
  const [idDocumentUrl, setIdDocumentUrl] = useState('')
  const [proofOfAddressUrl, setProofOfAddressUrl] = useState('')
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postalCode: '',
  })
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  // Store creation form
  const [storeName, setStoreName] = useState('')
  const [storeCategory, setStoreCategory] = useState('General Merchandise')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeLogo, setStoreLogo] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Upload progress & preview states
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingIdDoc, setUploadingIdDoc] = useState(false)
  const [uploadingProofDoc, setUploadingProofDoc] = useState(false)
  const [idDocFileName, setIdDocFileName] = useState('')
  const [proofDocFileName, setProofDocFileName] = useState('')

  const logoFileRef = useRef<HTMLInputElement>(null)
  const idDocFileRef = useRef<HTMLInputElement>(null)
  const proofDocFileRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP) for store logo.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Store logo must be under 5MB.')
      return
    }
    setError('')
    setUploadingLogo(true)
    try {
      const res = await uploadLogoMutation.mutateAsync(file)
      if (res.data?.url || (res as any).url) {
        const url = res.data?.url || (res as any).url
        setStoreLogo(url)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Logo upload failed.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleIdDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setError('Allowed file types: JPG, PNG, WebP, PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Document file must be under 10MB.')
      return
    }
    setError('')
    setUploadingIdDoc(true)
    try {
      const res = await uploadKycDocMutation.mutateAsync(file)
      if (res.data?.url || (res as any).url) {
        const url = res.data?.url || (res as any).url
        setIdDocumentUrl(url)
        setIdDocFileName(file.name)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'ID document upload failed.')
    } finally {
      setUploadingIdDoc(false)
    }
  }

  const handleProofDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setError('Allowed file types: JPG, PNG, WebP, PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Proof of address file must be under 10MB.')
      return
    }
    setError('')
    setUploadingProofDoc(true)
    try {
      const res = await uploadKycDocMutation.mutateAsync(file)
      if (res.data?.url || (res as any).url) {
        const url = res.data?.url || (res as any).url
        setProofOfAddressUrl(url)
        setProofDocFileName(file.name)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Proof document upload failed.')
    } finally {
      setUploadingProofDoc(false)
    }
  }

  // Fetch bank list
  useEffect(() => {
    let isMounted = true
    sellerService
      .getAvailableBanks('NGN')
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          // Deduplicate banks by code
          const seen = new Set<string>()
          const uniqueBanks = res.data.filter((b) => {
            if (!b.code || seen.has(b.code)) return false
            seen.add(b.code)
            return true
          })
          setBanks(uniqueBanks)
          if (uniqueBanks.length > 0) {
            setBankCode((prev) => prev || uniqueBanks[0].code)
            setBankName((prev) => prev || uniqueBanks[0].name)
          }
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  // Resolve account with Paystack
  const handleResolveAccount = async () => {
    if (!accountNumber || accountNumber.length < 10 || !bankCode) {
      setError('Please enter a valid 10-digit account number and select a bank')
      return
    }
    setError('')
    setResolvingBank(true)
    try {
      const res = await sellerService.resolveBankAccount({ accountNumber, bankCode })
      if (res.data?.accountName) {
        setResolvedAccountName(res.data.accountName)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resolve bank account')
    } finally {
      setResolvingBank(false)
    }
  }

  // Handle KYC Submission
  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!legalName.trim() || !idNumber.trim() || !accountNumber.trim()) {
      setError('Please complete all required fields')
      return
    }

    try {
      await submitKycMutation.mutateAsync({
        businessType,
        legalName: legalName.trim(),
        idType,
        idNumber: idNumber.trim(),
        idDocumentUrl: idDocumentUrl.trim() || undefined,
        proofOfAddressUrl: proofOfAddressUrl.trim() || undefined,
        storeAddress: address,
        bankDetails: {
          bankCode,
          bankName,
          accountNumber: accountNumber.trim(),
          accountName: resolvedAccountName.trim() || legalName.trim(),
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit KYC verification')
    }
  }

  // Handle Store Creation
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!storeName.trim()) {
      setError('Store name is required')
      return
    }

    try {
      await createStoreMutation.mutateAsync({
        storeName: storeName.trim(),
        storeCategory: storeCategory.trim(),
        storeDescription: storeDescription.trim(),
        storeLogo: storeLogo.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
      })
      navigate('/seller/dashboard')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Failed to create store'),
      )
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="sl-spinner" />
      </div>
    )
  }

  const kycStatus = kycStatusData?.kycStatus || 'NOT_STARTED'
  const isVerified = kycStatusData?.isVerified || false
  const storeCreated = kycStatusData?.storeCreated || false

  // 1. If KYC is UNDER_REVIEW or PENDING
  if (kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING') {
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
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '3rem 2.5rem',
            width: '100%',
            maxWidth: 580,
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: 32,
            }}
          >
            <FiClock />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>
            KYC Verification Under Review
          </h1>
          <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
            Your seller verification documents and bank details have been submitted. Our compliance
            team is verifying your information. Once approved, your store setup will be unlocked
            automatically.
          </p>
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #f3f4f6',
              borderRadius: 12,
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                fontSize: '0.85rem',
              }}
            >
              <span style={{ color: '#6b7280' }}>Verification Status:</span>
              <span style={{ fontWeight: 700, color: '#d97706' }}>UNDER REVIEW</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#6b7280' }}>Estimated Response Time:</span>
              <span style={{ fontWeight: 600, color: '#374151' }}>Within 24 Hours</span>
            </div>
          </div>
          <Link
            to="/seller"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#111827',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Go to Seller Overview
          </Link>
        </div>
      </div>
    )
  }

  // 2. If KYC is VERIFIED and Store is Not Yet Created
  if (isVerified && !storeCreated) {
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
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '2.5rem',
            width: '100%',
            maxWidth: 580,
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: '1.5rem',
              background: '#ecfdf5',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #a7f3d0',
            }}
          >
            <FiCheckCircle size={24} color="#059669" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#065f46' }}>
                KYC Verification Approved!
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857' }}>
                You are verified to sell on Cartiva. Please complete your store profile.
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px', color: '#111827' }}>
            Create Your Store
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
            This information will be displayed to customers on Cartiva Marketplace.
          </p>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleCreateStore}>
            <FormField label="Store Name" required>
              <input
                type="text"
                className="sl-input"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Apex Tech Essentials"
                required
              />
            </FormField>

            <FormField label="Store Category">
              <select
                className="sl-select"
                value={storeCategory}
                onChange={(e) => setStoreCategory(e.target.value)}
              >
                <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Health & Beauty">Health & Beauty</option>
                <option value="General Merchandise">General Merchandise</option>
              </select>
            </FormField>

            <FormField label="Store Description">
              <textarea
                className="sl-textarea"
                rows={3}
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="Tell customers about your products and brand..."
              />
            </FormField>

            <FormField
              label="Store Logo Image URL"
              hint="Provide a URL or upload your official logo below."
            >
              <input
                type="url"
                className="sl-input"
                value={storeLogo}
                onChange={(e) => setStoreLogo(e.target.value)}
                placeholder="https://..."
              />
              <input
                ref={logoFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={uploadingLogo}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <FiUpload /> {uploadingLogo ? 'Uploading Logo...' : 'Upload Image'}
                </button>
                {storeLogo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={storeLogo}
                      alt="Store Logo Preview"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        objectFit: 'cover',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                      ✓ Logo Attached
                    </span>
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="WhatsApp Contact Number">
              <input
                type="tel"
                className="sl-input"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+2348012345678"
              />
            </FormField>

            <button
              type="submit"
              disabled={createStoreMutation.isPending}
              style={{
                width: '100%',
                padding: '14px',
                background: '#007185',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              {createStoreMutation.isPending
                ? 'Creating Store...'
                : 'Complete Setup & Start Selling'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 3. If Store is already created & Verified
  if (isVerified && storeCreated) {
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
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '3rem 2.5rem',
            width: '100%',
            maxWidth: 540,
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: 32,
            }}
          >
            <FiCheckCircle />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>
            Store Active & Verified!
          </h1>
          <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
            Your store <strong>{kycStatusData?.storeName}</strong> is fully active and certified to
            sell products on Cartiva.
          </p>
          <Link
            to="/seller"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#007185',
              color: '#fff',
              padding: '14px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <FiShoppingBag /> Go to Seller Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // 4. Default: Multi-Step Seller KYC Onboarding Wizard
  const STEPS = [
    { key: 'legal', label: 'Business Profile', icon: <FiUser /> },
    { key: 'identity', label: 'Identity Verification', icon: <FiFileText /> },
    { key: 'bank', label: 'Bank & Payouts', icon: <FiCreditCard /> },
  ]

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
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: '2.5rem',
          width: '100%',
          maxWidth: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        }}
      >
        {/* Progress header */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem' }}>
          {STEPS.map((s, idx) => (
            <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 999,
                  background: idx <= step ? '#007185' : '#e5e7eb',
                  transition: 'background 0.2s',
                }}
              />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: idx === step ? '#007185' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {s.icon} {s.label}
              </span>
            </div>
          ))}
        </div>

        {kycStatus === 'REQUIRES_ACTION' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.85rem',
            }}
          >
            <FiAlertCircle size={20} />
            <div>
              <strong>Action Required:</strong>{' '}
              {kycStatusData?.kycData?.actionRequiredReason ||
                'Please review and resubmit your details.'}
            </div>
          </div>
        )}

        {kycStatus === 'REJECTED' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.85rem',
            }}
          >
            <FiAlertCircle size={20} />
            <div>
              <strong>Verification Rejected:</strong>{' '}
              {kycStatusData?.kycData?.rejectionReason || 'Please contact support.'}
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Step 0: Business & Legal Info */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
              Business Profile
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
              Provide your legal name and business structure.
            </p>

            <FormField label="Business Structure" required>
              <select
                className="sl-select"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
              >
                <option value="individual">Individual / Sole Trader</option>
                <option value="registered_business">Registered Business Name</option>
                <option value="company">Limited Company (LLC)</option>
              </select>
            </FormField>

            <FormField label="Legal Full Name (or Registered Entity Name)" required>
              <input
                type="text"
                className="sl-input"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As shown on official ID / CAC documents"
                required
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="City" required>
                <input
                  type="text"
                  className="sl-input"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="Lagos"
                />
              </FormField>
              <FormField label="State" required>
                <input
                  type="text"
                  className="sl-input"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="Lagos State"
                />
              </FormField>
            </div>

            <FormField label="Street Address">
              <input
                type="text"
                className="sl-input"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="123 Commercial Avenue"
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (!legalName.trim()) {
                    setError('Please provide your legal name')
                    return
                  }
                  setError('')
                  setStep(1)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 24px',
                  background: '#007185',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Next Step <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Identification */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
              Identity Verification
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
              Required for regulatory KYC and seller verification.
            </p>

            <FormField label="Identification Document Type" required>
              <select
                className="sl-select"
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
              >
                <option value="nin">National Identity Number (NIN)</option>
                <option value="bvn">Bank Verification Number (BVN)</option>
                <option value="passport">International Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="voters_card">Voter's Card</option>
              </select>
            </FormField>

            <FormField label="ID / Document Number" required>
              <input
                type="text"
                className="sl-input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter your ID / Registration Number"
                required
              />
            </FormField>

            <FormField
              label="Document Image / File (Optional)"
              hint="Upload your National ID, Passport, Driver's License, or BVN slip."
            >
              <input
                type="url"
                className="sl-input"
                value={idDocumentUrl}
                onChange={(e) => setIdDocumentUrl(e.target.value)}
                placeholder="https://..."
              />
              <input
                ref={idDocFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                style={{ display: 'none' }}
                onChange={handleIdDocUpload}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => idDocFileRef.current?.click()}
                  disabled={uploadingIdDoc}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <FiUpload />{' '}
                  {uploadingIdDoc ? 'Uploading Document...' : 'Upload Document / Image'}
                </button>
                {idDocumentUrl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      color: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    <FiCheckCircle />
                    <span>{idDocFileName || 'Document uploaded'}</span>
                  </div>
                )}
              </div>
            </FormField>

            <FormField
              label="Proof of Address Document / File (Optional)"
              hint="Utility bill, bank statement, or tenancy agreement (under 3 months old)."
            >
              <input
                type="url"
                className="sl-input"
                value={proofOfAddressUrl}
                onChange={(e) => setProofOfAddressUrl(e.target.value)}
                placeholder="https://..."
              />
              <input
                ref={proofDocFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                style={{ display: 'none' }}
                onChange={handleProofDocUpload}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => proofDocFileRef.current?.click()}
                  disabled={uploadingProofDoc}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <FiUpload />{' '}
                  {uploadingProofDoc ? 'Uploading Proof...' : 'Upload Document / Image'}
                </button>
                {proofOfAddressUrl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      color: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    <FiCheckCircle />
                    <span>{proofDocFileName || 'Proof of address uploaded'}</span>
                  </div>
                )}
              </div>
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <FiArrowLeft /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!idNumber.trim()) {
                    setError('Please provide your ID document number')
                    return
                  }
                  setError('')
                  setStep(2)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 24px',
                  background: '#007185',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Next Step <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Banking Details with Paystack Resolution */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
              Bank & Payout Verification
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
              Your sales revenue will be deposited to this verified bank account.
            </p>

            <FormField label="Select Bank" required>
              <select
                className="sl-select"
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value)
                  const b = banks.find((item) => item.code === e.target.value)
                  if (b) setBankName(b.name)
                  setResolvedAccountName('')
                }}
              >
                {banks.map((b, idx) => (
                  <option key={`${b.code}-${idx}`} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="10-Digit NUBAN Account Number" required>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="sl-input"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value)
                    setResolvedAccountName('')
                  }}
                  placeholder="0123456789"
                  required
                />
                <button
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={resolvingBank || accountNumber.length < 10}
                  style={{
                    padding: '0 16px',
                    background: '#111827',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {resolvingBank ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </FormField>

            {resolvedAccountName && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FiCheckCircle color="#059669" />
                <span>
                  Verified Account Name: <strong>{resolvedAccountName}</strong>
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <FiArrowLeft /> Back
              </button>
              <button
                type="button"
                onClick={handleSubmitKyc}
                disabled={submitKycMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 28px',
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FiShield />{' '}
                {submitKycMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
