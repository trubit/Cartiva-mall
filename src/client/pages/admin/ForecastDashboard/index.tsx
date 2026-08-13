import { useState } from 'react'
import { Container, Row, Col, Card, Tab, Nav, Spinner, Alert, Badge, Button } from 'react-bootstrap'
import { FiTrendingUp, FiAlertCircle, FiAlertTriangle, FiInfo, FiZap } from 'react-icons/fi'
import {
  useSalesForecast,
  useInventoryForecast,
  useRevenueForecast,
  useDecisionRecommendations,
  useForecastHistory,
} from '../../../hooks/useForecast.js'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type {
  ForecastDataPoint,
  IDecisionRecommendation,
} from '../../../../shared/types/forecast.types.js'

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })

const priorityColor: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'secondary',
}

function ForecastChart({
  dataPoints = [],
  title,
}: {
  dataPoints: ForecastDataPoint[]
  title: string
}) {
  const data = dataPoints.map((dp) => ({
    date: fmtDate(dp.date),
    predicted: dp.predicted,
    low: dp.confidenceLow,
    high: dp.confidenceHigh,
  }))

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Header
        style={{
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FiTrendingUp size={16} style={{ color: '#FF9900' }} />
        {title}
      </Card.Header>
      <Card.Body>
        {data.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
            No forecast data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" style={{ fontSize: 11 }} tick={{ fontSize: 11 }} />
              <YAxis style={{ fontSize: 11 }} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                formatter={(value) => [(value as number).toFixed(2), '']}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Area
                type="monotone"
                dataKey="high"
                stroke="transparent"
                fill="#fff7ed"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#FF9900"
                fill="#fff7ed"
                strokeWidth={2}
                dot={false}
              />
              <Area type="monotone" dataKey="low" stroke="transparent" fill="#fff" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  )
}

function RecommendationCard({ rec }: { rec: IDecisionRecommendation }) {
  const icon =
    rec.priority === 'critical' ? (
      <FiAlertCircle size={18} />
    ) : rec.priority === 'high' ? (
      <FiAlertTriangle size={18} />
    ) : (
      <FiInfo size={18} />
    )

  return (
    <div
      className="enterprise-stat-box"
      style={{
        padding: '14px 16px',
        borderLeft: `4px solid ${rec.priority === 'critical' ? '#dc2626' : rec.priority === 'high' ? '#d97706' : '#6b7280'}`,
        borderRadius: '0 8px 8px 0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-1">
        <span style={{ color: rec.priority === 'critical' ? '#dc2626' : '#d97706' }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{rec.title}</span>
        <Badge bg={priorityColor[rec.priority] ?? 'secondary'} style={{ fontSize: 10 }}>
          {rec.priority}
        </Badge>
      </div>
      <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 6px' }}>{rec.description}</p>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        <strong>Action:</strong> {rec.action}
      </div>
    </div>
  )
}

export default function ForecastDashboard() {
  const [tab, setTab] = useState('overview')
  const [horizon, setHorizon] = useState(30)

  const salesQ = useSalesForecast({ horizon })
  const inventoryQ = useInventoryForecast({ horizon })
  const revenueQ = useRevenueForecast({ horizon: 12 })
  const recommendationsQ = useDecisionRecommendations()
  const historyQ = useForecastHistory()

  const sales = salesQ.data as
    | { dataPoints?: ForecastDataPoint[]; confidenceScore?: number }
    | undefined
  const inventory = inventoryQ.data as { dataPoints?: ForecastDataPoint[] } | undefined
  const revenue = revenueQ.data as { dataPoints?: ForecastDataPoint[] } | undefined
  const recommendations = (recommendationsQ.data ?? []) as IDecisionRecommendation[]

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700 }}>
            AI Forecasting
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: 14 }}>
            Predictive analytics & decision intelligence
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span style={{ fontSize: 13, color: '#6b7280' }}>Horizon:</span>
          {[7, 14, 30, 90].map((h) => (
            <Button
              key={h}
              size="sm"
              variant={horizon === h ? 'warning' : 'outline-secondary'}
              style={horizon === h ? { background: '#FF9900', border: 'none', color: '#fff' } : {}}
              onClick={() => setHorizon(h)}
            >
              {h}d
            </Button>
          ))}
        </div>
      </div>

      {salesQ.isError && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
          <FiAlertCircle />
          Forecast engine unavailable — historical data may be insufficient.
        </Alert>
      )}

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? 'overview')}>
        <Nav variant="tabs" className="mb-3">
          {['overview', 'sales', 'inventory', 'revenue', 'recommendations', 'history'].map((t) => (
            <Nav.Item key={t}>
              <Nav.Link eventKey={t} style={{ textTransform: 'capitalize' }}>
                {t === 'recommendations' &&
                  recommendations.filter((r) => r.priority === 'critical').length > 0 && (
                    <Badge bg="danger" style={{ fontSize: 9, marginRight: 4 }}>
                      {recommendations.filter((r) => r.priority === 'critical').length}
                    </Badge>
                  )}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            {salesQ.isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#FF9900' }} />
              </div>
            ) : (
              <>
                {sales && (
                  <Alert
                    variant="info"
                    className="d-flex align-items-center gap-2 mb-3"
                    style={{ fontSize: 13 }}
                  >
                    <FiZap size={14} />
                    Model confidence score: <strong>{sales.confidenceScore ?? 0}%</strong> — based
                    on historical data
                  </Alert>
                )}
                <Row className="g-3">
                  <Col md={8}>
                    <ForecastChart
                      dataPoints={sales?.dataPoints ?? []}
                      title={`${horizon}-Day Sales Forecast`}
                    />
                  </Col>
                  <Col md={4}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                        Top Recommendations
                      </Card.Header>
                      <Card.Body className="d-flex flex-column gap-3">
                        {recommendationsQ.isLoading && <Spinner size="sm" />}
                        {recommendations.slice(0, 3).map((rec) => (
                          <RecommendationCard key={rec._id} rec={rec} />
                        ))}
                        {!recommendationsQ.isLoading && recommendations.length === 0 && (
                          <p className="text-muted" style={{ fontSize: 13 }}>
                            No recommendations — all metrics look healthy.
                          </p>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Tab.Pane>

          <Tab.Pane eventKey="sales">
            {salesQ.isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#FF9900' }} />
              </div>
            ) : (
              <ForecastChart dataPoints={sales?.dataPoints ?? []} title="Sales Forecast" />
            )}
          </Tab.Pane>

          <Tab.Pane eventKey="inventory">
            {inventoryQ.isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#FF9900' }} />
              </div>
            ) : (
              <ForecastChart
                dataPoints={inventory?.dataPoints ?? []}
                title="Inventory Depletion Forecast"
              />
            )}
          </Tab.Pane>

          <Tab.Pane eventKey="revenue">
            {revenueQ.isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#FF9900' }} />
              </div>
            ) : (
              <ForecastChart
                dataPoints={revenue?.dataPoints ?? []}
                title="Revenue Projection (12-month)"
              />
            )}
          </Tab.Pane>

          <Tab.Pane eventKey="recommendations">
            <div className="d-flex flex-column gap-3">
              {recommendationsQ.isLoading && (
                <div className="text-center py-4">
                  <Spinner animation="border" style={{ color: '#FF9900' }} />
                </div>
              )}
              {recommendations.map((rec) => (
                <RecommendationCard key={rec._id} rec={rec} />
              ))}
              {!recommendationsQ.isLoading && recommendations.length === 0 && (
                <Alert variant="success">
                  All systems are operating within expected parameters.
                </Alert>
              )}
            </div>
          </Tab.Pane>

          <Tab.Pane eventKey="history">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                Forecast History
              </Card.Header>
              <Card.Body>
                {historyQ.isLoading ? (
                  <Spinner size="sm" />
                ) : (historyQ.data?.items ?? []).length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    No forecast history yet.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {(historyQ.data?.items ?? []).map(
                      (f: {
                        _id: string
                        type: string
                        title: string
                        horizon: number
                        confidenceScore: number
                        generatedAt: string
                      }) => (
                        <div
                          key={f._id}
                          className="enterprise-stat-box"
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {f.type} · {f.horizon} day horizon
                            </div>
                          </div>
                          <div className="text-end">
                            <Badge bg="info" style={{ fontSize: 11 }}>
                              {f.confidenceScore}% confidence
                            </Badge>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              {fmtDate(f.generatedAt)}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  )
}
