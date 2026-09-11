import { useState, useEffect } from 'react'
import { FiCheckCircle, FiDollarSign, FiShoppingBag, FiTrendingUp } from 'react-icons/fi'
import { feeService, type IFeeLedgerResponse } from '../../../services/feeService.js'
import { formatMoney } from '../../../../shared/utils/money.js'

export default function FeePaymentPage() {
  const [data, setData] = useState<IFeeLedgerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    feeService
      .getMyFees()
      .then((res) => {
        if (mounted && res.data) setData(res.data)
      })
      .catch((err: any) => {
        if (mounted)
          setError(err.response?.data?.message || 'Failed to load sales and commission records')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
        Loading sales and commission records…
      </div>
    )
  }

  const summary = data?.summary
  const commissions = data?.fees ?? []

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>
          Sales & Cartiva Commissions
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Cartiva marketplace commission is automatically deducted from confirmed product sales
          (₦200 NGN / $0.15 USD per unit). Your net earnings are immediately eligible for payout.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#fca5a5',
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#94a3b8',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            <FiShoppingBag /> Total Gross Sales
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
            {formatMoney(summary?.totalSales ?? 0, 'NGN')}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#94a3b8',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            <FiDollarSign /> Cartiva Commission
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
            {formatMoney(summary?.totalCommission ?? 0, 'NGN')}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#94a3b8',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            <FiTrendingUp /> Net Seller Earnings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>
            {formatMoney(summary?.totalEarnings ?? 0, 'NGN')}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#94a3b8',
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            <FiCheckCircle /> Account Status
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4ade80' }}>
            Active & In Good Standing
          </div>
        </div>
      </div>

      {/* Sales & Commission Records Table */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
          Commission Accounting History
        </h3>

        {commissions.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
            No sales or commission records yet. Completed orders will appear here automatically.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '12px 10px' }}>Reference</th>
                  <th style={{ padding: '12px 10px' }}>Order #</th>
                  <th style={{ padding: '12px 10px' }}>Units Sold</th>
                  <th style={{ padding: '12px 10px' }}>Commission / Unit</th>
                  <th style={{ padding: '12px 10px' }}>Total Commission</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((item) => (
                  <tr
                    key={item._id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      color: '#cbd5e1',
                    }}
                  >
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f8fafc' }}>
                      {item.feeNumber}
                    </td>
                    <td style={{ padding: '12px 10px' }}>{item.orderNumber}</td>
                    <td style={{ padding: '12px 10px' }}>{item.quantity} unit(s)</td>
                    <td style={{ padding: '12px 10px' }}>
                      {formatMoney(item.feePerUnit, item.currency)}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: '#38bdf8' }}>
                      {formatMoney(item.totalFee, item.currency)}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(74, 222, 128, 0.15)',
                          color: '#4ade80',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        Deducted at Sale
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
