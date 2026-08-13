import { useState, useMemo } from 'react'
import {
  Container,
  Row,
  Col,
  Card,
  Tab,
  Nav,
  Badge,
  Spinner,
  Alert,
  Table,
  Button,
} from 'react-bootstrap'
import { FiDollarSign, FiFileText, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import {
  useFinanceSummary,
  useJournalEntries,
  useInvoices,
  useSettlements,
  useAuditTrail,
  useFinanceReports,
  useGenerateReport,
  useAccountingPeriods,
} from '../../../hooks/useFinance.js'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })

interface SummaryCard {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: SummaryCard) {
  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body className="d-flex align-items-center gap-3">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default function FinanceDashboard() {
  const [tab, setTab] = useState('overview')
  const { start, end } = useMemo(() => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: now.toISOString(),
    }
  }, [])

  const summaryQ = useFinanceSummary(start, end)
  const journalQ = useJournalEntries({ page: 1, limit: 10 })
  const invoicesQ = useInvoices({ page: 1, limit: 10 })
  const settlementsQ = useSettlements({ page: 1, limit: 10 })
  const auditQ = useAuditTrail({ page: 1, limit: 10 })
  const reportsQ = useFinanceReports({ page: 1, limit: 10 })
  const periodsQ = useAccountingPeriods()
  const generateReport = useGenerateReport()

  const s = summaryQ.data
  const loading = summaryQ.isLoading

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700 }}>
            Finance & Accounting
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: 14 }}>
            Enterprise financial management — {fmtDate(start)} to {fmtDate(end)}
          </p>
        </div>
        <Button
          variant="warning"
          size="sm"
          style={{ background: '#FF9900', border: 'none', color: '#fff' }}
          onClick={() => summaryQ.refetch()}
        >
          <FiRefreshCw size={14} className="me-1" />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" style={{ color: '#FF9900' }} />
        </div>
      )}

      {summaryQ.isError && (
        <Alert variant="warning" className="d-flex align-items-center gap-2">
          <FiAlertCircle />
          Finance data unavailable — check server connection.
        </Alert>
      )}

      {!loading && s && (
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} xl={3}>
            <StatCard
              label="Total Revenue"
              value={fmt(s.totalRevenue)}
              icon={<FiDollarSign size={22} />}
              color="#2563eb"
            />
          </Col>
          <Col xs={12} sm={6} xl={3}>
            <StatCard
              label="Net Profit"
              value={fmt(s.netProfit)}
              icon={<FiDollarSign size={22} />}
              color="#16a34a"
            />
          </Col>
          <Col xs={12} sm={6} xl={3}>
            <StatCard
              label="Tax Collected"
              value={fmt(s.totalTax)}
              icon={<FiFileText size={22} />}
              color="#d97706"
            />
          </Col>
          <Col xs={12} sm={6} xl={3}>
            <StatCard
              label="Open Invoices"
              value={s.openInvoices}
              icon={<FiFileText size={22} />}
              color="#7c3aed"
            />
          </Col>
        </Row>
      )}

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? 'overview')}>
        <Nav variant="tabs" className="mb-3">
          {['overview', 'journal', 'invoices', 'settlements', 'reports', 'audit', 'periods'].map(
            (t) => (
              <Nav.Item key={t}>
                <Nav.Link eventKey={t} style={{ textTransform: 'capitalize' }}>
                  {t === 'overview' ? 'Overview' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Nav.Link>
              </Nav.Item>
            ),
          )}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            <Row className="g-3">
              <Col md={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                    Recent Journal Entries
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table size="sm" className="mb-0" hover>
                      <thead style={{ background: '#f9fafb' }}>
                        <tr>
                          <th>Entry #</th>
                          <th>Description</th>
                          <th>Debit</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journalQ.isLoading && (
                          <tr>
                            <td colSpan={4} className="text-center py-3">
                              <Spinner size="sm" />
                            </td>
                          </tr>
                        )}
                        {(journalQ.data?.items ?? []).map(
                          (e: {
                            _id: string
                            entryNumber: string
                            description: string
                            totalDebit: number
                            status: string
                          }) => (
                            <tr key={e._id}>
                              <td style={{ fontSize: 12 }}>{e.entryNumber}</td>
                              <td style={{ fontSize: 12, maxWidth: 180 }} className="text-truncate">
                                {e.description}
                              </td>
                              <td style={{ fontSize: 12 }}>{fmt(e.totalDebit)}</td>
                              <td>
                                <Badge
                                  bg={e.status === 'posted' ? 'success' : 'secondary'}
                                  style={{ fontSize: 10 }}
                                >
                                  {e.status}
                                </Badge>
                              </td>
                            </tr>
                          ),
                        )}
                        {!journalQ.isLoading && !(journalQ.data?.items ?? []).length && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-3 text-muted"
                              style={{ fontSize: 13 }}
                            >
                              No journal entries yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                    Recent Invoices
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table size="sm" className="mb-0" hover>
                      <thead style={{ background: '#f9fafb' }}>
                        <tr>
                          <th>Invoice #</th>
                          <th>Type</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoicesQ.isLoading && (
                          <tr>
                            <td colSpan={4} className="text-center py-3">
                              <Spinner size="sm" />
                            </td>
                          </tr>
                        )}
                        {(invoicesQ.data?.items ?? []).map(
                          (inv: {
                            _id: string
                            invoiceNumber: string
                            type: string
                            total: number
                            status: string
                          }) => (
                            <tr key={inv._id}>
                              <td style={{ fontSize: 12 }}>{inv.invoiceNumber}</td>
                              <td style={{ fontSize: 12 }}>{inv.type}</td>
                              <td style={{ fontSize: 12 }}>{fmt(inv.total)}</td>
                              <td>
                                <Badge
                                  bg={
                                    inv.status === 'paid'
                                      ? 'success'
                                      : inv.status === 'issued'
                                        ? 'warning'
                                        : 'secondary'
                                  }
                                  style={{ fontSize: 10 }}
                                >
                                  {inv.status}
                                </Badge>
                              </td>
                            </tr>
                          ),
                        )}
                        {!invoicesQ.isLoading && !(invoicesQ.data?.items ?? []).length && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-3 text-muted"
                              style={{ fontSize: 13 }}
                            >
                              No invoices yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          <Tab.Pane eventKey="journal">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                Journal Entries
              </Card.Header>
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Entry #</th>
                      <th>Description</th>
                      <th>Total Debit</th>
                      <th>Total Credit</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(journalQ.data?.items ?? []).map(
                      (e: {
                        _id: string
                        entryNumber: string
                        description: string
                        totalDebit: number
                        totalCredit: number
                        status: string
                        createdAt: string
                      }) => (
                        <tr key={e._id}>
                          <td style={{ fontSize: 12 }}>{e.entryNumber}</td>
                          <td style={{ fontSize: 12 }}>{e.description}</td>
                          <td style={{ fontSize: 12 }}>{fmt(e.totalDebit)}</td>
                          <td style={{ fontSize: 12 }}>{fmt(e.totalCredit)}</td>
                          <td>
                            <Badge
                              bg={e.status === 'posted' ? 'success' : 'secondary'}
                              style={{ fontSize: 10 }}
                            >
                              {e.status}
                            </Badge>
                          </td>
                          <td style={{ fontSize: 12 }}>{fmtDate(e.createdAt)}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="invoices">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>Invoices</Card.Header>
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Invoice #</th>
                      <th>Type</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoicesQ.data?.items ?? []).map(
                      (inv: {
                        _id: string
                        invoiceNumber: string
                        type: string
                        subtotal: number
                        taxTotal: number
                        total: number
                        status: string
                        createdAt: string
                      }) => (
                        <tr key={inv._id}>
                          <td style={{ fontSize: 12 }}>{inv.invoiceNumber}</td>
                          <td style={{ fontSize: 12 }}>{inv.type}</td>
                          <td style={{ fontSize: 12 }}>{fmt(inv.subtotal)}</td>
                          <td style={{ fontSize: 12 }}>{fmt(inv.taxTotal)}</td>
                          <td style={{ fontSize: 12, fontWeight: 600 }}>{fmt(inv.total)}</td>
                          <td>
                            <Badge
                              bg={
                                inv.status === 'paid'
                                  ? 'success'
                                  : inv.status === 'issued'
                                    ? 'warning'
                                    : 'secondary'
                              }
                              style={{ fontSize: 10 }}
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td style={{ fontSize: 12 }}>{fmtDate(inv.createdAt)}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="settlements">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                Vendor Settlements
              </Card.Header>
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Vendor</th>
                      <th>Period</th>
                      <th>Gross</th>
                      <th>Commission</th>
                      <th>Net Payable</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settlementsQ.data?.items ?? []).map(
                      (s: {
                        _id: string
                        vendorName: string
                        periodStart: string
                        periodEnd: string
                        grossRevenue: number
                        commissionAmount: number
                        netPayable: number
                        status: string
                      }) => (
                        <tr key={s._id}>
                          <td style={{ fontSize: 12 }}>{s.vendorName}</td>
                          <td style={{ fontSize: 12 }}>
                            {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                          </td>
                          <td style={{ fontSize: 12 }}>{fmt(s.grossRevenue)}</td>
                          <td style={{ fontSize: 12 }}>{fmt(s.commissionAmount)}</td>
                          <td style={{ fontSize: 12, fontWeight: 600 }}>{fmt(s.netPayable)}</td>
                          <td>
                            <Badge
                              bg={
                                s.status === 'completed'
                                  ? 'success'
                                  : s.status === 'pending'
                                    ? 'warning'
                                    : 'secondary'
                              }
                              style={{ fontSize: 10 }}
                            >
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ),
                    )}
                    {!(settlementsQ.data?.items ?? []).length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-3 text-muted"
                          style={{ fontSize: 13 }}
                        >
                          No settlements yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="reports">
            <div className="d-flex justify-content-end mb-3">
              <Button
                variant="warning"
                size="sm"
                style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                disabled={generateReport.isPending}
                onClick={() => generateReport.mutate({ type: 'profit_loss', start, end })}
              >
                {generateReport.isPending ? <Spinner size="sm" /> : 'Generate P&L Report'}
              </Button>
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsQ.data?.items ?? []).map(
                      (r: {
                        _id: string
                        title: string
                        type: string
                        periodStart: string
                        periodEnd: string
                        createdAt: string
                      }) => (
                        <tr key={r._id}>
                          <td style={{ fontSize: 12 }}>{r.title}</td>
                          <td style={{ fontSize: 12 }}>{r.type}</td>
                          <td style={{ fontSize: 12 }}>
                            {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
                          </td>
                          <td style={{ fontSize: 12 }}>{fmtDate(r.createdAt)}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="audit">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                Financial Audit Trail
              </Card.Header>
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Entity ID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(auditQ.data?.items ?? []).map(
                      (a: {
                        _id: string
                        action: string
                        entityType: string
                        entityId: string
                        createdAt: string
                      }) => (
                        <tr key={a._id}>
                          <td style={{ fontSize: 12 }}>{a.action}</td>
                          <td style={{ fontSize: 12 }}>{a.entityType}</td>
                          <td style={{ fontSize: 11, fontFamily: 'monospace' }}>
                            {a.entityId.slice(-8)}
                          </td>
                          <td style={{ fontSize: 12 }}>{fmtDate(a.createdAt)}</td>
                        </tr>
                      ),
                    )}
                    {!(auditQ.data?.items ?? []).length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-3 text-muted"
                          style={{ fontSize: 13 }}
                        >
                          No audit records
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="periods">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                Accounting Periods
              </Card.Header>
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Name</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(periodsQ.data ?? []).map(
                      (p: {
                        _id: string
                        name: string
                        startDate: string
                        endDate: string
                        status: string
                      }) => (
                        <tr key={p._id}>
                          <td style={{ fontSize: 12 }}>{p.name}</td>
                          <td style={{ fontSize: 12 }}>{fmtDate(p.startDate)}</td>
                          <td style={{ fontSize: 12 }}>{fmtDate(p.endDate)}</td>
                          <td>
                            <Badge
                              bg={
                                p.status === 'open'
                                  ? 'success'
                                  : p.status === 'closed'
                                    ? 'secondary'
                                    : 'danger'
                              }
                              style={{ fontSize: 10 }}
                            >
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ),
                    )}
                    {!(periodsQ.data ?? []).length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-3 text-muted"
                          style={{ fontSize: 13 }}
                        >
                          No accounting periods defined
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  )
}
