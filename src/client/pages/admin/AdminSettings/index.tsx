import { useState } from 'react'
import { FiAlertTriangle, FiShield, FiList, FiCreditCard } from 'react-icons/fi'
import {
  useAdminFraudAlerts,
  useAdminAuditLogs,
  useAdminPayments,
} from '../../../hooks/useAdmin.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import type { FraudAlert, AuditLog, AdminPayment } from '../../../services/adminService.js'

const TABS = ['Fraud Alerts', 'Audit Log', 'Payments'] as const
type Tab = (typeof TABS)[number]

const SEVERITY_CLASSES: Record<string, string> = {
  high: 'admin-pill--blocked',
  medium: 'admin-pill--pending',
  low: 'admin-pill--active',
}

export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>('Fraud Alerts')
  const [payPage, setPayPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)
  const [payStatus, setPayStatus] = useState('')

  const { data: fraudRes, isLoading: fraudLoading } = useAdminFraudAlerts()
  const { data: auditRes, isLoading: auditLoading } = useAdminAuditLogs({
    page: String(auditPage),
    limit: '20',
  })
  const { data: payRes, isLoading: payLoading } = useAdminPayments({
    page: String(payPage),
    limit: '20',
    ...(payStatus ? { status: payStatus } : {}),
  })

  const fraudAlerts = fraudRes?.data?.alerts ?? []
  const auditLogs = auditRes?.data ?? []
  const auditPagination = auditRes?.pagination
  const payments = payRes?.data ?? []
  const payPagination = payRes?.pagination

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Settings & Monitoring</h1>
        <p className="admin-page-subtitle">Fraud detection, audit trail, and payment monitoring</p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid var(--color-neutral-100, #f3f4f6)',
          paddingBottom: '.5rem',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            className={`admin-btn ${tab === t ? 'admin-btn--primary' : 'admin-btn--deactivate'}`}
            onClick={() => setTab(t)}
            style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}
          >
            {t === 'Fraud Alerts' && <FiAlertTriangle size={13} />}
            {t === 'Audit Log' && <FiList size={13} />}
            {t === 'Payments' && <FiCreditCard size={13} />}
            {t}
            {t === 'Fraud Alerts' && fraudAlerts.length > 0 && (
              <span
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '.6rem',
                  fontWeight: 700,
                  padding: '.1rem .4rem',
                  borderRadius: 999,
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {fraudAlerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Fraud Alerts ─────────────────────────────────────────────────────── */}
      {tab === 'Fraud Alerts' && (
        <div className="admin-table-card">
          <div className="admin-table-toolbar">
            <h3>
              <FiShield size={14} style={{ marginRight: '.4rem', color: '#dc2626' }} />
              Fraud Alerts
              {fraudAlerts.length > 0 && (
                <span
                  style={{
                    marginLeft: '.5rem',
                    background: '#dc2626',
                    color: '#fff',
                    fontSize: '.6rem',
                    fontWeight: 700,
                    padding: '.1rem .4rem',
                    borderRadius: 999,
                  }}
                >
                  {fraudAlerts.length}
                </span>
              )}
            </h3>
          </div>
          {fraudLoading ? (
            <div className="admin-loading">Scanning for fraud signals…</div>
          ) : fraudAlerts.length === 0 ? (
            <div className="admin-table__empty" style={{ padding: '3rem', textAlign: 'center' }}>
              No fraud alerts — all clear
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Rule</th>
                    <th>Account</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudAlerts.map((alert: FraudAlert, i: number) => (
                    <tr key={i}>
                      <td>
                        <span
                          className={`admin-pill ${SEVERITY_CLASSES[alert.severity] ?? 'admin-pill--pending'}`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '.75rem', color: '#6b7280' }}>
                        {alert.ruleType?.replace(/_/g, ' ')}
                      </td>
                      <td>
                        <div style={{ fontSize: '.8rem', fontWeight: 600 }}>{alert.name}</div>
                        <div style={{ fontSize: '.7rem', color: '#6b7280' }}>{alert.email}</div>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{alert.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log ────────────────────────────────────────────────────────── */}
      {tab === 'Audit Log' && (
        <div className="admin-table-card">
          <div className="admin-table-toolbar">
            <h3>Admin Audit Log</h3>
          </div>
          {auditLoading ? (
            <div className="admin-loading">Loading audit log…</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Target</th>
                    <th>IP</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-table__empty">
                        No audit records yet
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: AuditLog) => (
                      <tr key={log._id}>
                        <td>
                          <span
                            className="admin-pill admin-pill--active"
                            style={{ fontFamily: 'monospace', fontSize: '.7rem' }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '.8rem', fontWeight: 600 }}>
                            {log.adminId?.firstName} {log.adminId?.lastName}
                          </div>
                          <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                            {log.adminId?.email}
                          </div>
                        </td>
                        <td style={{ fontSize: '.75rem', color: '#6b7280' }}>
                          <span className="admin-pill admin-pill--user">{log.targetType}</span>{' '}
                          <span title={log.targetId} style={{ fontFamily: 'monospace' }}>
                            {log.targetId.slice(-8)}
                          </span>
                        </td>
                        <td
                          style={{ fontSize: '.75rem', fontFamily: 'monospace', color: '#6b7280' }}
                        >
                          {log.ip || '—'}
                        </td>
                        <td style={{ fontSize: '.72rem', color: '#6b7280' }}>
                          {formatDate(log.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {auditPagination && auditPagination.totalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Page {auditPage} of {auditPagination.totalPages}
              </span>
              <div className="admin-pagination__btns">
                <button
                  className="admin-pagination__btn"
                  onClick={() => setAuditPage((p) => p - 1)}
                  disabled={!auditPagination.hasPrev}
                >
                  ‹
                </button>
                <button
                  className="admin-pagination__btn"
                  onClick={() => setAuditPage((p) => p + 1)}
                  disabled={!auditPagination.hasNext}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments ─────────────────────────────────────────────────────────── */}
      {tab === 'Payments' && (
        <div className="admin-table-card">
          <div className="admin-table-toolbar">
            <h3>All Payments {payPagination && `(${payPagination.total})`}</h3>
            <select
              className="admin-select"
              value={payStatus}
              onChange={(e) => {
                setPayStatus(e.target.value)
                setPayPage(1)
              }}
            >
              <option value="">All Status</option>
              {['pending', 'processing', 'completed', 'failed', 'refunded'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {payLoading ? (
            <div className="admin-loading">Loading payments…</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Payment Intent</th>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-table__empty">
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    payments.map((pay: AdminPayment) => (
                      <tr key={pay._id}>
                        <td
                          style={{ fontSize: '.72rem', fontFamily: 'monospace', color: '#6b7280' }}
                        >
                          {pay.paymentIntentId?.slice(-14)}
                        </td>
                        <td>
                          <div style={{ fontSize: '.8rem', fontWeight: 600 }}>
                            {pay.userId?.firstName} {pay.userId?.lastName}
                          </div>
                          <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                            {pay.userId?.email}
                          </div>
                        </td>
                        <td style={{ fontSize: '.8rem' }}>
                          {pay.orderId ? (
                            <>
                              #{pay.orderId.orderNumber} · {formatCurrency(pay.orderId.grandTotal)}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(pay.amount)}</td>
                        <td
                          style={{
                            fontSize: '.75rem',
                            color: '#6b7280',
                            textTransform: 'capitalize',
                          }}
                        >
                          {pay.paymentMethod}
                        </td>
                        <td>
                          <span
                            className={`admin-pill admin-pill--${pay.status === 'completed' ? 'active' : pay.status}`}
                          >
                            {pay.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '.72rem', color: '#6b7280' }}>
                          {formatDate(pay.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {payPagination && payPagination.totalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {(payPage - 1) * 20 + 1}–{Math.min(payPage * 20, payPagination.total)} of{' '}
                {payPagination.total}
              </span>
              <div className="admin-pagination__btns">
                <button
                  className="admin-pagination__btn"
                  onClick={() => setPayPage((p) => p - 1)}
                  disabled={!payPagination.hasPrev}
                >
                  ‹
                </button>
                <button
                  className="admin-pagination__btn"
                  onClick={() => setPayPage((p) => p + 1)}
                  disabled={!payPagination.hasNext}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
