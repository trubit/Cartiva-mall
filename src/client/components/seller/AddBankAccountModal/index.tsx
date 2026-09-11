import React, { useState } from 'react'
import { FiX, FiCheckCircle, FiAlertCircle, FiShield } from 'react-icons/fi'
import {
  useAddPayoutAccount,
  useAvailableBanks,
  useResolveBankAccount,
} from '../../../hooks/useSeller.js'

interface AddBankAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddBankAccountModal({ isOpen, onClose }: AddBankAccountModalProps) {
  const { data: banks, isLoading: loadingBanks } = useAvailableBanks('NGN')
  const addAccountMutation = useAddPayoutAccount()
  const resolveAccountMutation = useResolveBankAccount()

  const [bankCode, setBankCode] = useState<string>('')
  const [bankName, setBankName] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [accountName, setAccountName] = useState<string>('')
  const [isDefault, setIsDefault] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean>(false)

  if (!isOpen) return null

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value
    setBankCode(selectedCode)
    const b = banks?.find((item: any) => item.code === selectedCode)
    setBankName(b ? b.name : '')
    setIsVerified(false)
    setAccountName('')
    setErrorMsg(null)
  }

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setAccountNumber(val)
    setIsVerified(false)
    setAccountName('')
    setErrorMsg(null)
  }

  const handleVerifyAccount = async () => {
    if (!bankCode) {
      setErrorMsg('Please select your bank first.')
      return
    }
    if (accountNumber.length !== 10) {
      setErrorMsg('Account number must be 10 digits.')
      return
    }

    setErrorMsg(null)
    try {
      const res = await resolveAccountMutation.mutateAsync({
        accountNumber,
        bankCode,
      })
      if (res.data?.accountName) {
        setAccountName(res.data.accountName)
        setIsVerified(true)
      } else {
        setErrorMsg('Could not verify account name. Please check your account number.')
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          'Could not resolve bank account. Please verify the account number and bank.',
      )
    }
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!bankCode || !bankName) {
      setErrorMsg('Please select a bank.')
      return
    }
    if (accountNumber.length !== 10) {
      setErrorMsg('Account number must be 10 digits.')
      return
    }
    if (!accountName.trim()) {
      setErrorMsg('Please verify the account or enter the registered account name.')
      return
    }

    try {
      await addAccountMutation.mutateAsync({
        bankName,
        bankCode,
        accountNumber,
        accountName: accountName.trim(),
        currency: 'NGN',
        isDefault,
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save payout account. Please try again.')
    }
  }

  return (
    <div className="sl-modal-overlay" onClick={onClose}>
      <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sl-modal__header">
          <h3 className="sl-modal__title">Add Bank Payout Account</h3>
          <button className="sl-modal__close" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSaveAccount}>
          <div className="sl-modal__body">
            {errorMsg && (
              <div className="sl-alert sl-alert--error" style={{ margin: 0 }}>
                <FiAlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Bank Select */}
            <div>
              <label
                className="sl-form-label"
                style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Select Bank
              </label>
              {loadingBanks ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-400)' }}>
                  Loading banks...
                </p>
              ) : (
                <select value={bankCode} onChange={handleBankChange} className="sl-input" required>
                  <option value="">-- Choose your bank --</option>
                  {banks?.map((b: any, idx: number) => (
                    <option key={`${b.code}-${b.id || idx}`} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label
                className="sl-form-label"
                style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Account Number (NUBAN)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="0123456789"
                  maxLength={10}
                  value={accountNumber}
                  onChange={handleAccountNumberChange}
                  className="sl-input"
                  style={{ letterSpacing: '0.1em', fontWeight: 700 }}
                  required
                />
                <button
                  type="button"
                  onClick={handleVerifyAccount}
                  disabled={
                    accountNumber.length !== 10 || !bankCode || resolveAccountMutation.isPending
                  }
                  className="sl-btn sl-btn--secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {resolveAccountMutation.isPending ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>

            {/* Account Name */}
            <div>
              <label
                className="sl-form-label"
                style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Account Holder Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Account name will appear after verification"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="sl-input"
                  style={{
                    fontWeight: 700,
                    borderColor: isVerified ? '#10b981' : undefined,
                    background: isVerified ? 'rgba(16, 185, 129, 0.05)' : undefined,
                  }}
                  required
                />
                {isVerified && (
                  <FiCheckCircle
                    size={18}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#10b981',
                    }}
                  />
                )}
              </div>
              {isVerified && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '0.75rem',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <FiShield size={12} /> Account name verified with bank records.
                </p>
              )}
            </div>

            {/* Set as Default */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="default-bank-account"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="default-bank-account"
                style={{ fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Set as default payout account for automatic withdrawals
              </label>
            </div>
          </div>

          <div className="sl-modal__footer">
            <button
              type="button"
              className="sl-btn sl-btn--secondary"
              onClick={onClose}
              disabled={addAccountMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sl-btn sl-btn--primary"
              disabled={
                !bankCode ||
                accountNumber.length !== 10 ||
                !accountName ||
                addAccountMutation.isPending
              }
            >
              {addAccountMutation.isPending ? 'Saving...' : 'Save Bank Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
