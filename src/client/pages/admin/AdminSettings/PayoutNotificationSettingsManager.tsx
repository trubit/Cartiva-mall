import React, { useState, useEffect } from 'react'
import {
  FiMail,
  FiPlus,
  FiTrash2,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiBell,
  FiSend,
  FiUser,
  FiShield,
  FiExternalLink,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { usePayoutSettings, useUpdatePayoutSettings } from '../../../hooks/useAdmin.js'
import { formatDate } from '../../../../shared/helpers/index.js'

export default function PayoutNotificationSettingsManager() {
  const { data: settingsRes, isLoading, isError, refetch } = usePayoutSettings()
  const updateMutation = useUpdatePayoutSettings()

  const settings = settingsRes?.data

  const [emails, setEmails] = useState<string[]>([])
  const [notifyOnWithdrawal, setNotifyOnWithdrawal] = useState<boolean>(true)
  const [newEmailInput, setNewEmailInput] = useState<string>('')
  const [emailInputError, setEmailInputError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  useEffect(() => {
    if (settings) {
      setEmails(settings.notificationEmails || [])
      setNotifyOnWithdrawal(settings.notifyOnWithdrawalRequest !== false)
    }
  }, [settings])

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setEmailInputError(null)

    const rawInput = newEmailInput.trim()
    if (!rawInput) return

    // Allow multiple comma/space separated emails
    const candidates = rawInput
      .split(/[,;\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    const invalid = candidates.find((email) => !isValidEmail(email))
    if (invalid) {
      setEmailInputError(`"${invalid}" is not a valid email address.`)
      return
    }

    const newUnique = candidates.filter((email) => !emails.includes(email))
    if (newUnique.length === 0) {
      setEmailInputError('All entered email addresses are already in the list.')
      return
    }

    setEmails((prev) => [...prev, ...newUnique])
    setNewEmailInput('')
    setFeedback(null)
  }

  const handleRemoveEmail = (indexToRemove: number) => {
    setEmails((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    setFeedback(null)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setEmailInputError(null)

    // If there is pending text in input, add it first
    const finalEmails = [...emails]
    if (newEmailInput.trim()) {
      const candidates = newEmailInput
        .split(/[,;\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      const invalid = candidates.find((email) => !isValidEmail(email))
      if (invalid) {
        setEmailInputError(
          `"${invalid}" is not a valid email address. Please correct it or clear the input.`,
        )
        return
      }

      for (const cand of candidates) {
        if (!finalEmails.includes(cand)) {
          finalEmails.push(cand)
        }
      }
      setEmails(finalEmails)
      setNewEmailInput('')
    }

    if (notifyOnWithdrawal && finalEmails.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please add at least one notification email address to receive payout requests.',
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        notificationEmails: finalEmails,
        notifyOnWithdrawalRequest: notifyOnWithdrawal,
      })
      setFeedback({
        type: 'success',
        message:
          'Payout notification settings saved successfully! Alerts will be sent to the configured address(es).',
      })
      refetch()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update payout notification settings.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="admin-loading" style={{ padding: '3rem', textAlign: 'center' }}>
        Loading payout notification settings…
      </div>
    )
  }

  if (isError) {
    return (
      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          padding: '1.5rem',
          borderRadius: 8,
          color: '#991b1b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <FiAlertCircle size={20} /> Failed to load payout settings
        </div>
        <p style={{ margin: '0.5rem 0' }}>
          Unable to fetch the current payout notification configuration.
        </p>
        <button className="admin-btn admin-btn--primary" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* ── Top Header Card ── */}
      <div
        className="admin-table-card"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiMail size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Seller Withdrawal Email Notifications
              </h2>
            </div>
            <p
              style={{
                margin: '0.5rem 0 0',
                color: '#475569',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                maxWidth: 680,
              }}
            >
              Specify the email address of the person in charge of sending money to sellers (e.g.
              Owner, Finance Officer, or Accountant). Whenever a seller initiates a withdrawal, an
              instant email alert containing the seller&apos;s verified bank account details and
              payout amount will be sent here immediately.
            </p>
          </div>

          <Link
            to="/admin/withdrawals"
            className="admin-btn admin-btn--primary"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Go to Payouts Queue <FiExternalLink size={13} />
          </Link>
        </div>

        {/* Status Pill */}
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 700,
              background: notifyOnWithdrawal ? '#dcfce7' : '#fee2e2',
              color: notifyOnWithdrawal ? '#166534' : '#991b1b',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: notifyOnWithdrawal ? '#16a34a' : '#dc2626',
              }}
            />
            {notifyOnWithdrawal ? 'Instant Alerts: Active' : 'Instant Alerts: Paused'}
          </span>

          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {emails.length === 0
              ? 'No recipient email configured yet'
              : `${emails.length} recipient email${emails.length > 1 ? 's' : ''} configured`}
          </span>

          {settings?.updatedAt && (
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 'auto' }}>
              Last saved: {formatDate(settings.updatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* ── Feedback Message ── */}
      {feedback && (
        <div
          style={{
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            padding: '12px 16px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.9rem',
          }}
        >
          {feedback.type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Configuration Form Card ── */}
      <form
        onSubmit={handleSaveSettings}
        className="admin-table-card"
        style={{ padding: '1.75rem', borderRadius: 12 }}
      >
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
          Notification Recipient(s)
        </h3>

        {/* Master Toggle */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: '#e0f2fe',
                color: '#0369a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FiBell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                Enable Instant Withdrawal Email Alerts
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Automatically deliver an email whenever a seller requests to cash out earnings
              </div>
            </div>
          </div>

          <label
            style={{
              position: 'relative',
              display: 'inline-block',
              width: 48,
              height: 26,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={notifyOnWithdrawal}
              onChange={(e) => setNotifyOnWithdrawal(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: notifyOnWithdrawal ? '#0284c7' : '#cbd5e1',
                borderRadius: 26,
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: 20,
                  width: 20,
                  left: notifyOnWithdrawal ? 25 : 3,
                  bottom: 3,
                  background: 'white',
                  borderRadius: '50%',
                  transition: '0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </span>
          </label>
        </div>

        {/* Current Emails List */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#334155',
              marginBottom: 8,
            }}
          >
            Configured Email Address(es)
          </label>

          {emails.length === 0 ? (
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 8,
                padding: '1.5rem',
                textAlign: 'center',
                color: '#64748b',
                background: '#fafafa',
              }}
            >
              <FiMail size={24} style={{ opacity: 0.5, marginBottom: 6 }} />
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                No email address configured yet. Enter the email address below to receive instant
                seller payout alerts.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emails.map((email, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                      }}
                    >
                      <FiUser size={14} />
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                        {email}
                      </span>
                      {idx === 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            background: '#e0e7ff',
                            color: '#3730a3',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          PRIMARY
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                    title="Remove email"
                  >
                    <FiTrash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Email Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#334155',
              marginBottom: 6,
            }}
          >
            Add New Recipient Email
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="email"
                placeholder="e.g. payout-manager@cartivalmall.com or finance@gmail.com"
                value={newEmailInput}
                onChange={(e) => {
                  setNewEmailInput(e.target.value)
                  setEmailInputError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddEmail()
                  }
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 8,
                  border: `1px solid ${emailInputError ? '#ef4444' : '#cbd5e1'}`,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <FiMail
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => handleAddEmail()}
              className="admin-btn admin-btn--primary"
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FiPlus size={16} /> Add Email
            </button>
          </div>

          {emailInputError && (
            <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>
              {emailInputError}
            </div>
          )}
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Tip: You can paste multiple emails separated by commas or spaces. Both the store owner
            and accountant can receive alerts.
          </p>
        </div>

        {/* Submit Buttons */}
        <div
          style={{
            paddingTop: '1.25rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 700,
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            disabled={updateMutation.isPending}
          >
            <FiSave size={16} />
            {updateMutation.isPending ? 'Saving Settings…' : 'Save Notification Email'}
          </button>
        </div>
      </form>

      {/* ── Operational Architecture Guide & Email Preview ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Step-by-step Workflow */}
        <div
          className="admin-table-card"
          style={{ padding: '1.5rem', borderRadius: 12, border: '1px solid #e2e8f0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <FiShield size={20} style={{ color: '#0284c7' }} />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
              How Manual Bank Payouts Work (Option 1)
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                  Seller Requests Withdrawal
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Seller clicks withdraw on their seller portal. Funds are atomically reserved and
                  marked &ldquo;Pending Approval&rdquo;.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d97706',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                  Instant Email Notification Dispatched
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  The person in charge of sending money receives an immediate email alert containing
                  the seller&apos;s verified bank name, 10-digit account number, and amount.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#ede9fe',
                  color: '#7c3aed',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                  Send Money Via Bank App
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  You transfer the exact amount directly to the seller&apos;s account via standard
                  mobile or commercial internet banking (Zero CAC corporate registration required).
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                4
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                  Fulfill on Dashboard &amp; Record Ref
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  In the Admin Panel at{' '}
                  <Link to="/admin/withdrawals" style={{ color: '#0284c7', fontWeight: 600 }}>
                    Payouts &amp; Withdrawals
                  </Link>
                  , click &ldquo;Fulfill Payout&rdquo; and paste the bank session ID or reference.
                  The seller is instantly marked Completed.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div
          className="admin-table-card"
          style={{
            padding: '1.5rem',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
            <FiSend size={18} style={{ color: '#059669' }} />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
              Email Notification Sample
            </h4>
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#64748b' }}>
            Preview of the high-visibility email the designated recipient receives:
          </p>

          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '1rem',
              background: '#f8fafc',
              fontSize: '0.82rem',
              lineHeight: 1.4,
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 6,
                marginBottom: 8,
                color: '#475569',
              }}
            >
              <strong>Subject:</strong> 🔔 ACTION REQUIRED: New Seller Withdrawal Request —
              WD-EXAMPLE
            </div>
            <div
              style={{
                background: '#ffedd5',
                borderLeft: '4px solid #ea580c',
                padding: '6px 10px',
                color: '#9a3412',
                fontWeight: 600,
                marginBottom: 10,
                borderRadius: '0 4px 4px 0',
              }}
            >
              Action Required: Please send ₦30,000.00 to the seller below and record your bank
              reference.
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 10,
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>BENEFICIARY BANK ACCOUNT</div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: 1,
                  margin: '2px 0',
                }}
              >
                0123456789
              </div>
              <div style={{ fontWeight: 600, color: '#334155' }}>GTBank • Seller Full Name</div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#475569',
                marginBottom: 8,
              }}
            >
              <span>
                Store: <strong>Cartival Tech Store</strong>
              </span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>₦30,000.00</span>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '8px',
                background: '#0284c7',
                color: '#fff',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              Open Admin Dashboard to Fulfill
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
