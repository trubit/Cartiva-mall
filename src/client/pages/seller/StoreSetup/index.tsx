import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiShoppingBag,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiArrowLeft,
  FiUploadCloud,
  FiCamera,
  FiCreditCard,
  FiUserCheck,
} from 'react-icons/fi'
import {
  useSellerKycStatus,
  useCreateSellerStore,
  useUploadStoreLogo,
} from '../../../hooks/useSellerKyc.js'

function FormField({
  label,
  required,
  children,
  hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#374151',
          marginBottom: 6,
        }}
      >
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

export default function StoreSetup() {
  const navigate = useNavigate()
  const { data: kycData, isLoading } = useSellerKycStatus()
  const createStoreMutation = useCreateSellerStore()
  const uploadLogoMutation = useUploadStoreLogo()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [storeName, setStoreName] = useState('')
  const [storeCategory, setStoreCategory] = useState('Electronics & Gadgets')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeLogo, setStoreLogo] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (kycData) {
      if (!storeName && kycData.storeName) {
        setStoreName(kycData.storeName)
      } else if (!storeName && kycData.kycData?.legalName) {
        setStoreName(kycData.kycData.legalName)
      }
      if (kycData.storeLogo) {
        setStoreLogo(kycData.storeLogo)
      }
    }
  }, [kycData])

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploadSuccess('')

    if (!file.type.startsWith('image/')) {
      setUploadError('Only JPEG, PNG, or WebP images are allowed.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Store image must be under 5 MB.')
      return
    }

    // Local preview
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Real backend / Cloudinary upload
    try {
      const res = await uploadLogoMutation.mutateAsync(file)
      const uploadedUrl = res?.data?.url || res?.data?.storeLogo
      if (uploadedUrl) {
        setStoreLogo(uploadedUrl)
        setUploadSuccess('Store logo uploaded successfully!')
      }
    } catch (err: any) {
      setUploadError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to upload store logo. You may paste a URL instead.',
      )
    }
  }

  const isVerified = Boolean(kycData?.isVerified || kycData?.kycStatus === 'VERIFIED')
  const storeCreated = kycData?.storeCreated || false
  const kycStatus = isVerified ? 'VERIFIED' : kycData?.kycStatus || 'NOT_STARTED'

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!storeName.trim()) {
      setError('Please provide a store name')
      return
    }

    try {
      await createStoreMutation.mutateAsync({
        storeName: storeName.trim(),
        storeCategory,
        storeDescription: storeDescription.trim() || undefined,
        storeLogo: storeLogo.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
      })
      navigate('/seller')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create store')
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e5e7eb',
            borderTopColor: '#007185',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading verification state...</p>
      </div>
    )
  }

  // 1. If KYC is NOT verified yet
  if (!isVerified && kycStatus !== 'VERIFIED') {
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
              background: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: 32,
            }}
          >
            <FiShield />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>
            KYC Verification Required First
          </h1>
          <p
            style={{
              color: '#4b5563',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              margin: '0 0 2rem',
            }}
          >
            {kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING'
              ? 'Your KYC documents are currently under administrative review. Store setup will unlock immediately upon approval.'
              : 'You must submit your KYC identity and bank details before setting up your store on Cartiva.'}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/seller/kyc"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#007185',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              {kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING'
                ? 'Check KYC Status'
                : 'Complete KYC Verification'}{' '}
              <FiArrowRight />
            </Link>
            <Link
              to="/seller"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f3f4f6',
                color: '#374151',
                padding: '12px 20px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <FiArrowLeft /> Back to Overview
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. If Store is already created
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
            Store Setup Completed!
          </h1>
          <p
            style={{
              color: '#4b5563',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              margin: '0 0 2rem',
            }}
          >
            Your store <strong>{kycData?.storeName}</strong> is verified and ready to receive
            orders.
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

  // 3. Store Setup Form (KYC Verified, Store Not Created)
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        background: '#f9fafb',
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
              Your identity is verified. Complete your store profile below to activate selling.
            </p>
          </div>
        </div>

        {/* Verification Summary Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: '1.5rem',
          }}
        >
          <h4
            style={{
              margin: '0 0 10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Seller Verification Summary
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem' }}>
              <FiUserCheck size={16} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0f172a' }}>Identity:</strong>{' '}
                <span style={{ color: '#475569' }}>
                  {kycData?.kycData?.legalName || 'Verified Individual'}
                  {kycData?.kycData?.idNumber ? ` (${kycData.kycData.idNumber})` : ''}
                </span>
                <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.75rem' }}>
                  ✓ KYC Approved
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem' }}>
              <FiCreditCard size={16} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0f172a' }}>Bank Account:</strong>{' '}
                <span style={{ color: '#475569' }}>
                  {kycData?.kycData?.bankDetails?.bankName || 'Payout Bank'}{' '}
                  {kycData?.kycData?.bankDetails?.accountNumber
                    ? `(${kycData.kycData.bankDetails.accountNumber})`
                    : ''}
                </span>
                <div style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>
                  {kycData?.kycData?.bankDetails?.isResolved
                    ? '✓ Paystack Verified'
                    : '✓ Bank Configured'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px', color: '#111827' }}>
            Set Up Your Store
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
            Configure your public marketplace storefront details.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.85rem',
            }}
          >
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateStore}>
          <FormField label="Store Name" required hint="Your official public brand or shop name.">
            <input
              type="text"
              className="sl-input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Apex Electronics Nigeria"
              required
            />
          </FormField>

          <FormField label="Store Primary Category" required>
            <select
              className="sl-select"
              value={storeCategory}
              onChange={(e) => setStoreCategory(e.target.value)}
            >
              <option value="Electronics & Gadgets">Electronics & Gadgets</option>
              <option value="Fashion & Apparel">Fashion & Apparel</option>
              <option value="Home & Kitchen">Home & Kitchen</option>
              <option value="Health & Beauty">Health & Beauty</option>
              <option value="Computers & Accessories">Computers & Accessories</option>
              <option value="Phones & Tablets">Phones & Tablets</option>
              <option value="Groceries & Essentials">Groceries & Essentials</option>
              <option value="General Merchandise">General Merchandise</option>
            </select>
          </FormField>

          <FormField
            label="Store Description"
            hint="Brief summary of what your shop sells and brand promise."
          >
            <textarea
              className="sl-textarea"
              rows={3}
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Authorized distributor of premium electronics with nationwide warranty..."
            />
          </FormField>

          {/* Store Logo Image Upload */}
          <FormField
            label="Store Logo / Brand Image"
            hint="Upload your official store logo (PNG, JPEG, WebP up to 5MB)."
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
                marginTop: 6,
              }}
            >
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  border: '2px dashed #cbd5e1',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {logoPreview || storeLogo ? (
                  <img
                    src={logoPreview || storeLogo}
                    alt="Store Logo Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setLogoPreview(null)}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <FiCamera size={22} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: 2 }}>Logo</div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLogoMutation.isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: uploadLogoMutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  <FiUploadCloud size={16} />
                  {uploadLogoMutation.isPending ? 'Uploading Image...' : 'Choose Store Image'}
                </button>

                {uploadError && (
                  <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 4 }}>
                    {uploadError}
                  </div>
                )}
                {uploadSuccess && (
                  <div style={{ color: '#059669', fontSize: '0.78rem', marginTop: 4 }}>
                    {uploadSuccess}
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  <input
                    type="url"
                    className="sl-input"
                    value={storeLogo}
                    onChange={(e) => {
                      setStoreLogo(e.target.value)
                      setLogoPreview(null)
                    }}
                    placeholder="Or enter image URL (https://...)"
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                </div>
              </div>
            </div>
          </FormField>

          <FormField
            label="WhatsApp Contact / Customer Support Phone (Optional)"
            hint="Direct line for buyer inquiries and order support."
          >
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
              fontSize: '0.95rem',
              cursor: createStoreMutation.isPending ? 'not-allowed' : 'pointer',
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {createStoreMutation.isPending ? (
              'Creating Store & Generating Slug...'
            ) : (
              <>
                <FiShoppingBag /> Complete Store Setup & Start Selling
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
