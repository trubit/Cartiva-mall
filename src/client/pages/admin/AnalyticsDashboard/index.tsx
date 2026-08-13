import { useState } from 'react'
import { Container, Row, Col, Card, Tab, Nav, Spinner, Alert, Table, Button } from 'react-bootstrap'
import { FiTrendingUp, FiUsers, FiShoppingBag, FiAlertCircle } from 'react-icons/fi'
import {
  useAnalyticsDashboard,
  useAnalyticsSales,
  useAnalyticsCustomers,
  useAnalyticsVendors,
  useAnalyticsProducts,
  useAnalyticsInventory,
  useAnalyticsLogistics,
} from '../../../hooks/useAnalytics.js'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(n)

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
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

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState('overview')
  const [period, setPeriod] = useState<{ start?: string; end?: string }>({})

  const dashQ = useAnalyticsDashboard(period)
  const salesQ = useAnalyticsSales(period)
  const customersQ = useAnalyticsCustomers(period)
  const vendorsQ = useAnalyticsVendors(period)
  const productsQ = useAnalyticsProducts(period)
  const inventoryQ = useAnalyticsInventory()
  const logisticsQ = useAnalyticsLogistics(period)

  const dash = dashQ.data
  const sales = salesQ.data
  const customers = customersQ.data
  const inventory = inventoryQ.data
  const logistics = logisticsQ.data

  const kpis = dash?.kpis ?? []

  const periodOptions = [
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
  ]

  const chartData = [
    { name: 'Revenue', value: sales?.revenue ?? 0 },
    { name: 'Orders', value: sales?.totalOrders ?? 0 },
    { name: 'Refunds', value: sales?.refunds ?? 0 },
  ]

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700 }}>
            Business Intelligence
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: 14 }}>
            Real-time analytics across the entire marketplace
          </p>
        </div>
        <div className="d-flex gap-2">
          {periodOptions.map((opt) => (
            <Button
              key={opt.days}
              size="sm"
              variant="outline-secondary"
              onClick={() => {
                const start = new Date(Date.now() - opt.days * 86400000).toISOString()
                const end = new Date().toISOString()
                setPeriod({ start, end })
              }}
              style={{ fontSize: 13 }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {dashQ.isLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" style={{ color: '#FF9900' }} />
        </div>
      )}

      {dashQ.isError && (
        <Alert variant="warning" className="d-flex align-items-center gap-2">
          <FiAlertCircle />
          Analytics data unavailable.
        </Alert>
      )}

      {!dashQ.isLoading && (
        <>
          <Row className="g-3 mb-4">
            {kpis.map((kpi: { label: string; value: number; unit?: string }, i: number) => (
              <Col xs={12} sm={6} xl={3} key={i}>
                <KpiCard
                  label={kpi.label}
                  value={kpi.unit === 'NGN' ? fmt(kpi.value) : kpi.value.toLocaleString()}
                  icon={i % 2 === 0 ? <FiTrendingUp size={22} /> : <FiUsers size={22} />}
                  color={['#2563eb', '#16a34a', '#d97706', '#7c3aed'][i % 4]}
                />
              </Col>
            ))}
          </Row>

          <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? 'overview')}>
            <Nav variant="tabs" className="mb-3">
              {[
                'overview',
                'sales',
                'customers',
                'vendors',
                'products',
                'inventory',
                'logistics',
              ].map((t) => (
                <Nav.Item key={t}>
                  <Nav.Link eventKey={t} style={{ textTransform: 'capitalize' }}>
                    {t}
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="overview">
                <Row className="g-3">
                  <Col md={8}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                        Revenue Overview
                      </Card.Header>
                      <Card.Body>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" style={{ fontSize: 12 }} />
                            <YAxis style={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#FF9900" fill="#fff7ed" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                        Quick Stats
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex flex-column gap-3">
                          {[
                            {
                              label: 'Total Orders',
                              value: (sales?.totalOrders ?? 0).toLocaleString(),
                            },
                            { label: 'Avg Order Value', value: fmt(sales?.averageOrderValue ?? 0) },
                            {
                              label: 'New Customers',
                              value: (customers?.newCustomers ?? 0).toLocaleString(),
                            },
                            {
                              label: 'Retention Rate',
                              value: `${(customers?.retentionRate ?? 0).toFixed(1)}%`,
                            },
                            {
                              label: 'Delivery Success',
                              value: `${(logistics?.deliverySuccessRate ?? 0).toFixed(1)}%`,
                            },
                            {
                              label: 'Low Stock Items',
                              value: (inventory?.lowStockCount ?? 0).toString(),
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="d-flex justify-content-between align-items-center"
                            >
                              <span style={{ fontSize: 13, color: '#6b7280' }}>{item.label}</span>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>

              <Tab.Pane eventKey="sales">
                <Card className="border-0 shadow-sm">
                  <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                    Sales Analytics
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      {[
                        { label: 'Gross Sales', value: fmt(sales?.grossSales ?? 0) },
                        { label: 'Net Sales', value: fmt(sales?.netSales ?? 0) },
                        {
                          label: 'Total Orders',
                          value: (sales?.totalOrders ?? 0).toLocaleString(),
                        },
                        { label: 'Average Order Value', value: fmt(sales?.averageOrderValue ?? 0) },
                        { label: 'Refunds', value: (sales?.refunds ?? 0).toLocaleString() },
                      ].map((item) => (
                        <Col xs={6} md={4} key={item.label}>
                          <div
                            className="enterprise-stat-box"
                            style={{ padding: '16px', borderRadius: 8 }}
                          >
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="customers">
                <Card className="border-0 shadow-sm">
                  <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                    Customer Analytics
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      {[
                        {
                          label: 'Total Customers',
                          value: (customers?.totalCustomers ?? 0).toLocaleString(),
                        },
                        {
                          label: 'New Customers',
                          value: (customers?.newCustomers ?? 0).toLocaleString(),
                        },
                        {
                          label: 'Returning Customers',
                          value: (customers?.returningCustomers ?? 0).toLocaleString(),
                        },
                        {
                          label: 'Retention Rate',
                          value: `${(customers?.retentionRate ?? 0).toFixed(1)}%`,
                        },
                      ].map((item) => (
                        <Col xs={6} md={3} key={item.label}>
                          <div
                            className="enterprise-stat-box"
                            style={{ padding: '16px', borderRadius: 8 }}
                          >
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="vendors">
                <Card className="border-0 shadow-sm">
                  <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                    Top Vendors by Revenue
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table size="sm" hover className="mb-0">
                      <thead style={{ background: '#f9fafb' }}>
                        <tr>
                          <th>#</th>
                          <th>Vendor ID</th>
                          <th>Revenue</th>
                          <th>Orders</th>
                          <th>Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorsQ.isLoading && (
                          <tr>
                            <td colSpan={5} className="text-center py-3">
                              <Spinner size="sm" />
                            </td>
                          </tr>
                        )}
                        {(vendorsQ.data ?? []).map(
                          (
                            v: {
                              _id: string
                              totalRevenue: number
                              totalOrders: number
                              commissionEarned: number
                            },
                            i: number,
                          ) => (
                            <tr key={v._id ?? i}>
                              <td style={{ fontSize: 12 }}>{i + 1}</td>
                              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                {String(v._id).slice(-8)}
                              </td>
                              <td style={{ fontSize: 12 }}>{fmt(v.totalRevenue)}</td>
                              <td style={{ fontSize: 12 }}>{v.totalOrders}</td>
                              <td style={{ fontSize: 12 }}>{fmt(v.commissionEarned)}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="products">
                <Card className="border-0 shadow-sm">
                  <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                    <FiShoppingBag className="me-2" />
                    Top Products by Revenue
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table size="sm" hover className="mb-0">
                      <thead style={{ background: '#f9fafb' }}>
                        <tr>
                          <th>#</th>
                          <th>Product ID</th>
                          <th>Units Sold</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productsQ.data ?? []).map(
                          (p: { _id: string; totalSold: number; revenue: number }, i: number) => (
                            <tr key={p._id ?? i}>
                              <td style={{ fontSize: 12 }}>{i + 1}</td>
                              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                {String(p._id).slice(-8)}
                              </td>
                              <td style={{ fontSize: 12 }}>{p.totalSold}</td>
                              <td style={{ fontSize: 12 }}>{fmt(p.revenue)}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="inventory">
                <Row className="g-3">
                  {[
                    {
                      label: 'Total Products',
                      value: (inventory?.totalProducts ?? 0).toLocaleString(),
                      color: '#2563eb',
                    },
                    {
                      label: 'Low Stock',
                      value: (inventory?.lowStockCount ?? 0).toLocaleString(),
                      color: '#d97706',
                    },
                    {
                      label: 'Out of Stock',
                      value: (inventory?.outOfStockCount ?? 0).toLocaleString(),
                      color: '#dc2626',
                    },
                  ].map((item) => (
                    <Col xs={12} md={4} key={item.label}>
                      <Card className="border-0 shadow-sm text-center">
                        <Card.Body>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>{item.label}</div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: item.color }}>
                            {item.value}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Tab.Pane>

              <Tab.Pane eventKey="logistics">
                <Row className="g-3">
                  {[
                    {
                      label: 'Total Shipments',
                      value: (logistics?.totalShipments ?? 0).toLocaleString(),
                    },
                    {
                      label: 'Delivered On Time',
                      value: (logistics?.deliveredOnTime ?? 0).toLocaleString(),
                    },
                    {
                      label: 'Success Rate',
                      value: `${(logistics?.deliverySuccessRate ?? 0).toFixed(1)}%`,
                    },
                    {
                      label: 'Avg Delivery Days',
                      value: `${(logistics?.averageDeliveryDays ?? 0).toFixed(1)} days`,
                    },
                  ].map((item) => (
                    <Col xs={6} md={3} key={item.label}>
                      <div
                        className="enterprise-stat-box"
                        style={{
                          padding: '20px',
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{item.value}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </>
      )}
    </Container>
  )
}
