import React, { useState, useEffect } from 'react'
import {
  FiDollarSign,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiClock,
  FiLayers,
} from 'react-icons/fi'
import { useAdminCommissionPolicy, useUpdateCommissionPolicy } from '../../../hooks/useAdmin.js'
import { formatDate } from '../../../../shared/helpers/index.js'

const SUPPORTED_CURRENCIES = [
  'NGN',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'GHS',
  'ZAR',
  'KES',
]

export default function CommissionPolicyManager() {
  const { data: policyRes, isLoading, isError, refetch } = useAdminCommissionPolicy()
  const updateMutation = useUpdateCommissionPolicy()

  const policy = policyRes?.data

  const [baseSellerFee, setBaseSellerFee] = useState<number>(200)
  const [baseCurrency, setBaseCurrency] = useState<string>('NGN')
  const [commissionType, setCommissionType] = useState<string>('FLAT_PER_UNIT')
  const [percentageRate, setPercentageRate] = useState<number>(0)
  const [baseUsdRate, setBaseUsdRate] = useState<number>(0.15)
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({})
  const [reason, setReason] = useState<string>('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  useEffect(() => {
    if (policy) {
      setBaseSellerFee(policy.baseSellerFee ?? 200)
      setBaseCurrency(policy.baseCurrency ?? 'NGN')
      setCommissionType(policy.commissionType ?? 'FLAT_PER_UNIT')
      setPercentageRate(policy.percentageRate ?? 0)
      setBaseUsdRate(policy.baseUsdRate ?? 0.15)

      const rates =
        policy.currencyRates && typeof policy.currencyRates === 'object'
          ? { ...policy.currencyRates }
          : {}
      setCurrencyRates(rates)
    }
  }, [policy])

  const handleRateChange = (curr: string, value: string) => {
    const num = parseFloat(value) || 0
    setCurrencyRates((prev) => ({
      ...prev,
      [curr]: num,
    }))
    if (curr === baseCurrency) {
      setBaseSellerFee(num)
    }
  }

  const handleBaseFeeChange = (val: number) => {
    setBaseSellerFee(val)
    setCurrencyRates((prev) => ({
      ...prev,
      [baseCurrency]: val,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (baseSellerFee < 0) {
      setFeedback({ type: 'error', message: 'Base seller fee cannot be negative.' })
      return
    }

    try {
      const res = await updateMutation.mutateAsync({
        baseSellerFee,
        baseCurrency,
        commissionType: commissionType as any,
        percentageRate,
        baseUsdRate,
        currencyRates,
        reason: reason.trim() || 'Admin dynamic commission adjustment',
      })
      if (res?.data) {
        setBaseSellerFee(res.data.baseSellerFee ?? baseSellerFee)
        setBaseCurrency(res.data.baseCurrency ?? baseCurrency)
        setCommissionType(res.data.commissionType ?? commissionType)
        setPercentageRate(res.data.percentageRate ?? percentageRate)
        setBaseUsdRate(res.data.baseUsdRate ?? baseUsdRate)
        if (res.data.currencyRates && typeof res.data.currencyRates === 'object') {
          setCurrencyRates({ ...res.data.currencyRates })
        }
      }
      setFeedback({
        type: 'success',
        message: `Marketplace commission policy updated successfully (v${res?.data?.version ?? 'new'}) and active in real-time!`,
      })
      setReason('')
      await refetch()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to update commission policy.'
      setFeedback({ type: 'error', message: msg })
    }
  }

  if (isLoading) {
    return (
      <div className="admin-table-card admin-loading">
        <FiRefreshCw className="animate-spin" size={18} />
        <span>Loading dynamic commission policy engine...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="admin-table-card"
        style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}
      >
        <FiAlertCircle size={24} style={{ marginBottom: '.5rem' }} />
        <p style={{ margin: 0, fontWeight: 500 }}>Failed to load marketplace commission policy.</p>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => refetch()}
          style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}
        >
          <FiRefreshCw size={13} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Configuration Card */}
      <div className="admin-table-card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--color-neutral-200, #e5e7eb)',
            paddingBottom: '.75rem',
            flexWrap: 'wrap',
            gap: '.75rem',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--color-brand-text, #131921)',
                display: 'flex',
                alignItems: 'center',
                gap: '.5rem',
                margin: 0,
              }}
            >
              <FiDollarSign color="#ff9900" size={18} />
              Marketplace Seller Commission Policy
            </h3>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '.8rem',
                color: 'var(--color-neutral-500, #6b7280)',
              }}
            >
              Deducted per unit sold on confirmed marketplace transactions. Changes apply instantly
              without restarting the server.
            </p>
          </div>
          {policy && (
            <span
              className="admin-pill admin-pill--active"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}
            >
              <FiCheckCircle size={12} /> Active (v{policy.version})
            </span>
          )}
        </div>

        {feedback && (
          <div
            className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'} d-flex align-items-center gap-2 mb-4`}
            style={{ fontSize: '.85rem', padding: '.75rem 1rem' }}
          >
            {feedback.type === 'success' ? (
              <FiCheckCircle size={16} style={{ flexShrink: 0 }} />
            ) : (
              <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Base Seller Fee */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs, .8rem)',
                  fontWeight: 600,
                  color: 'var(--color-brand-text, #131921)',
                  marginBottom: '.35rem',
                }}
              >
                Base Unit Fee ({baseCurrency})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={baseSellerFee}
                onChange={(e) => handleBaseFeeChange(parseFloat(e.target.value) || 0)}
                className="form-control"
                required
              />
              <span
                style={{
                  fontSize: '.72rem',
                  color: 'var(--color-neutral-500, #6b7280)',
                  marginTop: '.25rem',
                  display: 'block',
                }}
              >
                Standard flat fee deducted per product item sold.
              </span>
            </div>

            {/* Base Currency */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs, .8rem)',
                  fontWeight: 600,
                  color: 'var(--color-brand-text, #131921)',
                  marginBottom: '.35rem',
                }}
              >
                Base System Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="form-select"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span
                style={{
                  fontSize: '.72rem',
                  color: 'var(--color-neutral-500, #6b7280)',
                  marginTop: '.25rem',
                  display: 'block',
                }}
              >
                Primary accounting currency for baseline calculations.
              </span>
            </div>

            {/* Commission Mode */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs, .8rem)',
                  fontWeight: 600,
                  color: 'var(--color-brand-text, #131921)',
                  marginBottom: '.35rem',
                }}
              >
                Commission Model
              </label>
              <select
                value={commissionType}
                onChange={(e) => setCommissionType(e.target.value)}
                className="form-select"
              >
                <option value="FLAT_PER_UNIT">Flat Fee Per Unit</option>
                <option value="PERCENTAGE">Percentage of Item Total</option>
                <option value="HYBRID">Hybrid (Flat Fee + Percentage)</option>
              </select>
              <span
                style={{
                  fontSize: '.72rem',
                  color: 'var(--color-neutral-500, #6b7280)',
                  marginTop: '.25rem',
                  display: 'block',
                }}
              >
                Calculation formula applied at checkout.
              </span>
            </div>

            {/* Percentage Rate (if applicable) */}
            {(commissionType === 'PERCENTAGE' || commissionType === 'HYBRID') && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-xs, .8rem)',
                    fontWeight: 600,
                    color: 'var(--color-brand-text, #131921)',
                    marginBottom: '.35rem',
                  }}
                >
                  Percentage Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={percentageRate}
                  onChange={(e) => setPercentageRate(parseFloat(e.target.value) || 0)}
                  className="form-control"
                  required
                />
                <span
                  style={{
                    fontSize: '.72rem',
                    color: 'var(--color-neutral-500, #6b7280)',
                    marginTop: '.25rem',
                    display: 'block',
                  }}
                >
                  Commission percentage cut from item price.
                </span>
              </div>
            )}

            {/* Fallback Base USD Rate */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs, .8rem)',
                  fontWeight: 600,
                  color: 'var(--color-brand-text, #131921)',
                  marginBottom: '.35rem',
                }}
              >
                Fallback Rate ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={baseUsdRate}
                onChange={(e) => setBaseUsdRate(parseFloat(e.target.value) || 0)}
                className="form-control"
                required
              />
              <span
                style={{
                  fontSize: '.72rem',
                  color: 'var(--color-neutral-500, #6b7280)',
                  marginTop: '.25rem',
                  display: 'block',
                }}
              >
                Converted via live FX engine for unsupported currencies.
              </span>
            </div>
          </div>

          {/* Currency Matrix */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4
              style={{
                fontSize: '.9rem',
                fontWeight: 700,
                color: 'var(--color-brand-text, #131921)',
                marginBottom: '.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '.45rem',
              }}
            >
              <FiLayers size={15} color="#ff9900" /> Currency Commission Rates Matrix
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '.75rem',
                background: 'var(--color-neutral-50, #f8f9fa)',
                padding: '1.25rem',
                borderRadius: '8px',
                border: '1px solid var(--color-neutral-200, #e5e7eb)',
              }}
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <div key={curr} style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '.75rem',
                      fontWeight: 700,
                      color: curr === baseCurrency ? '#ff9900' : 'var(--color-brand-text, #131921)',
                      marginBottom: '.15rem',
                    }}
                  >
                    <span>{curr}</span>
                    {curr === baseCurrency && (
                      <span
                        style={{
                          fontSize: '.6rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(255, 153, 0, 0.18)',
                          color: '#ff9900',
                          fontWeight: 700,
                        }}
                      >
                        Base
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={currencyRates[curr] ?? ''}
                    onChange={(e) => handleRateChange(curr, e.target.value)}
                    placeholder="0.00"
                    className="form-control form-control-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Change Reason & Submit */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--color-neutral-200, #e5e7eb)',
              paddingTop: '1.25rem',
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs, .8rem)',
                  fontWeight: 600,
                  color: 'var(--color-brand-text, #131921)',
                  marginBottom: '.35rem',
                }}
              >
                Audit Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Q4 promotional seller fee revision"
                className="form-control"
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="admin-btn admin-btn--primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.45rem',
                padding: '.6rem 1.4rem',
                fontSize: '.85rem',
                fontWeight: 600,
                height: 38,
                borderRadius: '6px',
              }}
            >
              <FiSave size={15} />
              {updateMutation.isPending ? 'Saving Policy...' : 'Save & Publish Commission Policy'}
            </button>
          </div>
        </form>
      </div>

      {/* Audit Trail Card */}
      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem',
              margin: 0,
              fontSize: '.9rem',
              fontWeight: 700,
              color: 'var(--color-brand-text, #131921)',
            }}
          >
            <FiClock size={15} color="#ff9900" /> Policy Version History & Audit Trail
          </h3>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Adjustment Summary</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {!policy?.auditTrail || policy.auditTrail.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-table__empty">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                policy.auditTrail
                  .slice()
                  .reverse()
                  .map((log, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          fontSize: '.78rem',
                          color: 'var(--color-neutral-500, #6b7280)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(log.timestamp)}
                      </td>
                      <td style={{ fontSize: '.8rem', fontWeight: 600 }}>
                        {log.modifierEmail || String(log.modifiedBy).substring(0, 8)}
                      </td>
                      <td style={{ fontSize: '.8rem' }}>
                        {log.previousState && log.newState ? (
                          <span>
                            Fee:{' '}
                            <del style={{ color: '#ef4444' }}>
                              {log.previousState.baseSellerFee}{' '}
                              {log.previousState.baseCurrency || 'NGN'}
                            </del>{' '}
                            &rarr;{' '}
                            <strong style={{ color: '#10b981' }}>
                              {log.newState.baseSellerFee} {log.newState.baseCurrency || 'NGN'}
                            </strong>
                          </span>
                        ) : (
                          'Baseline configuration initialized'
                        )}
                      </td>
                      <td
                        style={{ fontSize: '.78rem', color: 'var(--color-neutral-500, #6b7280)' }}
                      >
                        {log.reason || 'System initialization'}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
