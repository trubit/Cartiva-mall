import { useEffect, useState } from 'react'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Alert from 'react-bootstrap/Alert'
import { FiAlertCircle, FiCheckCircle, FiUser, FiShield } from 'react-icons/fi'
import {
  useSellerProfile,
  useOnboardSeller,
  useUpdateSellerProfile,
} from '../../../hooks/useSeller.js'
import { useAuthStore } from '../../../store/authStore.js'

const INITIAL_ADDR = { country: '', state: '', city: '', street: '', postalCode: '' }

export default function SellerSettings() {
  const { data: profile, isLoading } = useSellerProfile()
  const {
    mutate: onboard,
    isPending: onboarding,
    error: onboardError,
    isSuccess: onboardSuccess,
  } = useOnboardSeller()
  const {
    mutate: update,
    isPending: updating,
    error: updateError,
    isSuccess: updateSuccess,
  } = useUpdateSellerProfile()
  const user = useAuthStore((s) => s.user)

  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeAddress, setStoreAddress] = useState(INITIAL_ADDR)

  useEffect(() => {
    if (profile) {
      setStoreName(profile.storeName)
      setStoreDescription(profile.storeDescription)
      setStoreAddress({
        country: profile.storeAddress.country ?? '',
        state: profile.storeAddress.state ?? '',
        city: profile.storeAddress.city ?? '',
        street: profile.storeAddress.street ?? '',
        postalCode: profile.storeAddress.postalCode ?? '',
      })
    }
  }, [profile])

  const setAddr = (k: keyof typeof INITIAL_ADDR, v: string) =>
    setStoreAddress((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { storeName, storeDescription, storeAddress }
    if (!profile) {
      onboard({ storeName, storeDescription, storeAddress })
    } else {
      update(payload)
    }
  }

  if (isLoading) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <div>
            <h1 className="sl-page-title">Store Settings</h1>
          </div>
        </div>
        <div className="d-flex flex-column gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container section sl-page">
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Store Settings</h1>
          <p className="sl-page-subtitle">
            {profile ? 'Manage your store profile' : 'Complete your seller onboarding'}
          </p>
        </div>
        {profile?.isVerified && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#067D62',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
            }}
          >
            <FiCheckCircle /> Verified Seller
          </span>
        )}
      </div>

      {/* Linked account */}
      <div className="sl-settings-section">
        <div className="sl-settings-section__head">
          <FiUser size={18} />
          <h3>Linked Account</h3>
        </div>
        <div className="sl-settings-section__body">
          <Row className="g-3">
            <Col xs={12} sm={6}>
              <label className="sl-form-label">Full Name</label>
              <p className="sl-form-value">
                {user?.firstName} {user?.lastName}
              </p>
            </Col>
            <Col xs={12} sm={6}>
              <label className="sl-form-label">Email</label>
              <p className="sl-form-value">{user?.email}</p>
            </Col>
            <Col xs={12} sm={6}>
              <label className="sl-form-label">Role</label>
              <p className="sl-form-value" style={{ textTransform: 'capitalize' }}>
                {user?.role}
              </p>
            </Col>
            <Col xs={12} sm={6}>
              <label className="sl-form-label">Verification Status</label>
              <p className="sl-form-value">
                {profile?.isVerified ? (
                  <span style={{ color: '#067D62', fontWeight: 600 }}>✓ Verified</span>
                ) : (
                  <span style={{ color: '#d97706' }}>Pending verification</span>
                )}
              </p>
            </Col>
          </Row>
        </div>
      </div>

      {/* Store profile form */}
      <div className="sl-settings-section">
        <div className="sl-settings-section__head">
          <FiShield size={18} />
          <h3>{profile ? 'Store Profile' : 'Create Your Store'}</h3>
        </div>
        <div className="sl-settings-section__body">
          {(onboardError || updateError) && (
            <Alert variant="danger" className="mb-3">
              <FiAlertCircle className="me-2" />
              {((onboardError ?? updateError) as Error)?.message ?? 'An error occurred'}
            </Alert>
          )}
          {(onboardSuccess || updateSuccess) && (
            <Alert variant="success" className="mb-3">
              <FiCheckCircle className="me-2" />
              {onboardSuccess ? 'Seller profile created successfully!' : 'Store profile updated!'}
            </Alert>
          )}

          <Form id="seller-settings-form" onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="ss-name">
                  <Form.Label>
                    Store Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. My Awesome Store"
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="ss-desc">
                  <Form.Label>Store Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Tell customers about your store…"
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <p
                  style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-600)',
                  }}
                >
                  Store Address
                </p>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="ss-country">
                  <Form.Label>Country</Form.Label>
                  <Form.Control
                    value={storeAddress.country}
                    onChange={(e) => setAddr('country', e.target.value)}
                    placeholder="e.g. United States"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="ss-state">
                  <Form.Label>State / Province</Form.Label>
                  <Form.Control
                    value={storeAddress.state}
                    onChange={(e) => setAddr('state', e.target.value)}
                    placeholder="e.g. California"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="ss-city">
                  <Form.Label>City</Form.Label>
                  <Form.Control
                    value={storeAddress.city}
                    onChange={(e) => setAddr('city', e.target.value)}
                    placeholder="e.g. San Francisco"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="ss-postal">
                  <Form.Label>Postal Code</Form.Label>
                  <Form.Control
                    value={storeAddress.postalCode}
                    onChange={(e) => setAddr('postalCode', e.target.value)}
                    placeholder="e.g. 94102"
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="ss-street">
                  <Form.Label>Street Address</Form.Label>
                  <Form.Control
                    value={storeAddress.street}
                    onChange={(e) => setAddr('street', e.target.value)}
                    placeholder="e.g. 123 Market Street"
                  />
                </Form.Group>
              </Col>
            </Row>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={onboarding || updating}
                className="sl-btn sl-btn--primary"
              >
                {onboarding || updating
                  ? 'Saving…'
                  : profile
                    ? 'Save Changes'
                    : 'Create Store Profile'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}
