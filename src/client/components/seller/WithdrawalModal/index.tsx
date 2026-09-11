import React, { useState } from 'react'
import {
  FiX,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiShield,
  FiPlus,
} from 'react-icons/fi'
import { useRequestWithdrawal, useSellerPayoutAccounts } from '../../../hooks/useSeller.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type { ISellerPayoutAccount } from '../../../../shared/types/seller.types.js'

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  availableBalance: number
  currency?: string
  onOpenAddBankModal: () => void
}

export default function WithdrawalModal({
  isOpen,
  onClose,
  availableBalance,
  currency = 'NGN',
  onOpenAddBankModal,
}: WithdrawalModalProps) {
  const { data: payoutAccounts, isLoading: loadingAccounts } = useSellerPayoutAccounts()
  const requestWithdrawalMutation = useRequestWithdrawal()
  const { formatPrice } = useCurrency()

  const [amountStr, setAmountStr] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [step, setStep] = useState<'input' | 'review' | 'success'>('input')
  const [confirmedAuth, setConfirmedAuth] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completedTxNumber, setCompletedTxNumber] = useState<string>('')

  // Set default account when accounts load
  React.useEffect(() => {
    if (payoutAccounts && payoutAccounts.length > 0 && !selectedAccountId) {
      const defaultAcc =
        payoutAccounts.find((a: ISellerPayoutAccount) => a.isDefault) || payoutAccounts[0]
      setSelectedAccountId(defaultAcc._id)
    }
  }, [payoutAccounts, selectedAccountId])

  if (!isOpen) return null

  const amount = parseFloat(amountStr) || 0
  const fee = 0 // Marketplace absorbed fee
  const netAmount = Math.max(0, amount - fee)
  const selectedAccount = payoutAccounts?.find(
    (a: ISellerPayoutAccount) => a._id === selectedAccountId,
  )

  const handleSetPreset = (percent: number) => {
    const calculated = (availableBalance * percent).toFixed(2)
    setAmountStr(calculated)
    setErrorMsg(null)
  }

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount greater than 0.')
      return
    }
    if (amount < 1) {
      setErrorMsg('Minimum withdrawal amount is 1.00')
      return
    }
    if (amount > availableBalance) {
      setErrorMsg(
        `Amount exceeds your available balance of ${formatPrice(availableBalance, currency)}`,
      )
      return
    }
    if (!selectedAccountId || !selectedAccount) {
      setErrorMsg('Please select or add a valid bank payout account.')
      return
    }

    setStep('review')
  }

  const handleConfirmWithdrawal = async () => {
    if (!confirmedAuth) {
      setErrorMsg('Please confirm and authorize this transaction.')
      return
    }

    setErrorMsg(null)
    const idempotencyKey = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    try {
      const res = await requestWithdrawalMutation.mutateAsync({
        amount,
        payoutAccountId: selectedAccountId,
        idempotencyKey,
      })

      if (res.data?.withdrawalNumber) {
        setCompletedTxNumber(res.data.withdrawalNumber)
      }
      setStep('success')
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          'Failed to process withdrawal request. Please check your balance and try again.',
      )
    }
  }

  const handleModalClose = () => {
    setStep('input')
    setAmountStr('')
    setErrorMsg(null)
    setConfirmedAuth(false)
    onClose()
  }

  return (
    <div className="sl-modal-overlay" onClick={handleModalClose}>
      <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sl-modal__header">
          <h3 className="sl-modal__title">
            {step === 'success'
              ? 'Withdrawal Submitted'
              : step === 'review'
                ? 'Review Withdrawal'
                : 'Request Withdrawal'}
          </h3>
          <button className="sl-modal__close" onClick={handleModalClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="sl-modal__body">
          {errorMsg && (
            <div className="sl-alert sl-alert--error" style={{ margin: 0 }}>
              <FiAlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: AMOUNT & ACCOUNT INPUT */}
          {step === 'input' && (
            <form
              onSubmit={handleProceedToReview}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {/* Available Balance Box */}
              <div
                style={{
                  background:
                    'linear-gradient(135deg, rgba(11, 45, 61, 0.08), rgba(0, 113, 133, 0.12))',
                  border: '1px solid rgba(0, 113, 133, 0.25)',
                  borderRadius: 12,
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-neutral-500, #64748b)',
                      fontWeight: 600,
                    }}
                  >
                    AVAILABLE TO WITHDRAW
                  </span>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#007185' }}>
                    {formatPrice(availableBalance, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSetPreset(1)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: '#007185',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Withdraw All
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label
                  className="sl-form-label"
                  style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}
                >
                  Withdrawal Amount ({currency})
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-neutral-400, #94a3b8)',
                      fontWeight: 700,
                    }}
                  >
                    {currency === 'NGN' ? '₦' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={availableBalance}
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="sl-input"
                    style={{ paddingLeft: 30, fontSize: '1.1rem', fontWeight: 700 }}
                    required
                  />
                </div>

                {/* Preset buttons */}
                <div className="sl-amount-presets">
                  <button
                    type="button"
                    className="sl-amount-preset-btn"
                    onClick={() => handleSetPreset(0.25)}
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className="sl-amount-preset-btn"
                    onClick={() => handleSetPreset(0.5)}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="sl-amount-preset-btn"
                    onClick={() => handleSetPreset(0.75)}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className="sl-amount-preset-btn"
                    onClick={() => handleSetPreset(1)}
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Bank Account Selection */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <label className="sl-form-label" style={{ fontWeight: 700, margin: 0 }}>
                    Payout Destination (Bank)
                  </label>
                  <button
                    type="button"
                    onClick={onOpenAddBankModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007185',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FiPlus size={14} /> Add Bank
                  </button>
                </div>

                {loadingAccounts ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-400)' }}>
                    Loading bank accounts...
                  </p>
                ) : payoutAccounts && payoutAccounts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {payoutAccounts.map((acc: ISellerPayoutAccount) => (
                      <div
                        key={acc._id}
                        className={`sl-bank-card ${selectedAccountId === acc._id ? 'sl-bank-card--selected' : ''}`}
                        onClick={() => setSelectedAccountId(acc._id)}
                        style={{ cursor: 'pointer', margin: 0 }}
                      >
                        <div className="sl-bank-card__info">
                          <div className="sl-bank-icon">
                            <FiDollarSign />
                          </div>
                          <div>
                            <p className="sl-bank-card__name">{acc.bankName}</p>
                            <p className="sl-bank-card__number">
                              {acc.accountName} •••• {acc.accountNumber.slice(-4)}
                            </p>
                          </div>
                        </div>
                        {acc.isDefault && (
                          <span className="sl-badge sl-badge--default">Default</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1.25rem',
                      textAlign: 'center',
                      background: 'var(--color-neutral-50, #f8fafc)',
                      border: '1px dashed var(--color-neutral-300, #cbd5e1)',
                      borderRadius: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-neutral-600)',
                      }}
                    >
                      No bank payout accounts found.
                    </p>
                    <button
                      type="button"
                      className="sl-btn sl-btn--primary sl-btn--sm"
                      onClick={onOpenAddBankModal}
                    >
                      <FiPlus /> Add Bank Account
                    </button>
                  </div>
                )}
              </div>

              {/* Summary breakdown */}
              {amount > 0 && (
                <div className="sl-summary-box">
                  <div className="sl-summary-row">
                    <span>Withdrawal Amount</span>
                    <span>{formatPrice(amount, currency)}</span>
                  </div>
                  <div className="sl-summary-row">
                    <span>Processing Fee</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>FREE (₦0.00)</span>
                  </div>
                  <div className="sl-summary-row sl-summary-row--total">
                    <span>You Receive in Bank</span>
                    <span style={{ color: '#007185' }}>{formatPrice(netAmount, currency)}</span>
                  </div>
                </div>
              )}

              {/* Submit to review */}
              <button
                type="submit"
                className="sl-btn sl-btn--primary sl-btn--lg"
                disabled={amount <= 0 || amount > availableBalance || !selectedAccountId}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                Review & Confirm <FiArrowRight />
              </button>
            </form>
          )}

          {/* STEP 2: REVIEW & AUTHORIZATION */}
          {step === 'review' && selectedAccount && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  background: 'var(--color-neutral-50, #f8fafc)',
                  border: '1px solid var(--color-neutral-200, #e2e8f0)',
                  borderRadius: 12,
                  padding: '1.25rem',
                }}
              >
                <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>
                  Transfer Details
                </h4>
                <div className="sl-summary-row">
                  <span>Destination Bank</span>
                  <span style={{ fontWeight: 700 }}>{selectedAccount.bankName}</span>
                </div>
                <div className="sl-summary-row">
                  <span>Account Name</span>
                  <span style={{ fontWeight: 700 }}>{selectedAccount.accountName}</span>
                </div>
                <div className="sl-summary-row">
                  <span>Account Number</span>
                  <span style={{ fontWeight: 700 }}>
                    •••• {selectedAccount.accountNumber.slice(-4)}
                  </span>
                </div>
                <div className="sl-summary-row sl-summary-row--total">
                  <span>Payout Total</span>
                  <span style={{ color: '#007185', fontSize: '1.2rem' }}>
                    {formatPrice(netAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Security confirmation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  background: 'rgba(0, 113, 133, 0.05)',
                  border: '1px solid rgba(0, 113, 133, 0.2)',
                  borderRadius: 8,
                }}
              >
                <input
                  type="checkbox"
                  id="confirm-withdrawal-auth"
                  checked={confirmedAuth}
                  onChange={(e) => setConfirmedAuth(e.target.checked)}
                  style={{ marginTop: 3, cursor: 'pointer' }}
                />
                <label
                  htmlFor="confirm-withdrawal-auth"
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-neutral-700, #334155)',
                    cursor: 'pointer',
                  }}
                >
                  <FiShield size={14} style={{ marginRight: 4, color: '#007185' }} />I authorize
                  this withdrawal of <strong>{formatPrice(netAmount, currency)}</strong> to my
                  registered bank account.
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="sl-btn sl-btn--secondary"
                  onClick={() => setStep('input')}
                  disabled={requestWithdrawalMutation.isPending}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="sl-btn sl-btn--primary"
                  onClick={handleConfirmWithdrawal}
                  disabled={!confirmedAuth || requestWithdrawalMutation.isPending}
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {requestWithdrawalMutation.isPending
                    ? 'Processing Transfer...'
                    : 'Confirm & Withdraw'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 1rem',
                }}
              >
                <FiCheckCircle />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                Withdrawal Submitted!
              </h4>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-neutral-600)',
                  margin: '0 0 1rem',
                }}
              >
                Your payout request of <strong>{formatPrice(netAmount, currency)}</strong> has been
                received and is being processed by the banking network.
              </p>
              {completedTxNumber && (
                <div
                  style={{
                    display: 'inline-block',
                    padding: '0.4rem 0.85rem',
                    background: 'var(--color-neutral-100, #f1f5f9)',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginBottom: '1.5rem',
                  }}
                >
                  Ref: {completedTxNumber}
                </div>
              )}
              <button
                type="button"
                className="sl-btn sl-btn--primary sl-btn--lg"
                onClick={handleModalClose}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
