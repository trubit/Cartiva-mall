import { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Table,
  Form,
  Alert,
  Tab,
  Nav,
  Spinner,
} from 'react-bootstrap'
import {
  FiCpu,
  FiAlertTriangle,
  FiShield,
  FiPlay,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi'
import api from '../../../services/api.js'

interface DecisionProposalItem {
  decisionId: string
  objective: string
  actionName: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  autonomyLevel: number
  confidence: number
  status: string
}

interface BusinessSignalItem {
  signalId: string
  signalType: string
  sourceDomain: string
  severity: string
  observedValue: number
  thresholdValue: number
  createdAt: string
}

interface AutonomyPolicyData {
  globalKillSwitch: boolean
  domainKillSwitches: {
    pricingAutonomy: boolean
    marketingAutonomy: boolean
    inventoryAutonomy: boolean
    recommendationAutonomy: boolean
    notificationAutonomy: boolean
  }
  budgets: {
    maxActionsPerHour: number
    maxChainDepth: number
  }
}

export default function AdminAutonomy() {
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false)
  const [policy, setPolicy] = useState<AutonomyPolicyData | null>(null)
  const [proposals, setProposals] = useState<DecisionProposalItem[]>([])
  const [signals, setSignals] = useState<BusinessSignalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('proposals')
  const [simulationResult, setSimulationResult] = useState<string | null>(null)
  const [simulatingId, setSimulatingId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [policyRes, proposalsRes, signalsRes] = await Promise.all([
        api.get('/autonomy/policy'),
        api.get('/autonomy/proposals'),
        api.get('/autonomy/signals'),
      ])

      if (policyRes.data?.data) {
        setPolicy(policyRes.data.data)
        setGlobalKillSwitch(Boolean(policyRes.data.data.globalKillSwitch))
      }
      if (proposalsRes.data?.data) {
        setProposals(proposalsRes.data.data.proposals ?? proposalsRes.data.data ?? [])
      }
      if (signalsRes.data?.data) {
        setSignals(signalsRes.data.data.signals ?? signalsRes.data.data ?? [])
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load autonomous economy data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleToggleKillSwitch = async (checked: boolean) => {
    try {
      setGlobalKillSwitch(checked)
      await api.post('/autonomy/kill-switch', { global: true, enabled: checked })
      void fetchData()
    } catch (err: any) {
      setGlobalKillSwitch(!checked)
      setError(err.response?.data?.message || 'Failed to update global kill switch')
    }
  }

  const handleSimulate = async (id: string) => {
    setSimulatingId(id)
    try {
      const res = await api.post(`/autonomy/proposals/${id}/simulate`)
      const data = res.data?.data
      setSimulationResult(
        `Simulation for [${id}] completed: Mode: ${data?.simulationMode || 'dry_run'}, Risk: ${data?.riskLevel || 'N/A'}, Mutation: ${data?.isProductionMutated ? 'YES' : 'NONE (Safe Dry-Run)'}, Latency: ${data?.estimatedExecutionMs ?? 150}ms.`,
      )
    } catch (err: any) {
      setError(err.response?.data?.message || `Simulation failed for decision [${id}]`)
    } finally {
      setSimulatingId(null)
    }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/autonomy/proposals/${id}/approve`, {
        notes: 'Approved via Admin Autonomy Dashboard',
      })
      void fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to approve decision [${id}]`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/autonomy/proposals/${id}/reject`, {
        reason: 'Rejected via Admin Autonomy Dashboard',
      })
      void fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to reject decision [${id}]`)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = proposals.filter(
    (p) => p.status === 'PENDING_APPROVAL' || p.status === 'PROPOSED',
  ).length

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FiCpu className="text-primary" /> Autonomous Business Economy
          </h2>
          <p className="text-muted mb-0">
            Controlled Decision Engine, Bounded Execution & Kill Switches
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </Button>
          <Form.Check
            type="switch"
            id="kill-switch"
            label={
              <span className="fw-bold text-danger">
                <FiShield /> Global Kill Switch
              </span>
            }
            checked={globalKillSwitch}
            onChange={(e) => void handleToggleKillSwitch(e.target.checked)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      {globalKillSwitch && (
        <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4">
          <FiAlertTriangle size={20} />
          <div>
            <strong>GLOBAL AUTONOMY KILL SWITCH ACTIVE!</strong> All new autonomous executions are
            halted immediately across all business domains.
          </div>
        </Alert>
      )}

      {simulationResult && (
        <Alert
          variant="info"
          dismissible
          onClose={() => setSimulationResult(null)}
          className="mb-4"
        >
          <strong>Dry-Run Simulation Output:</strong> {simulationResult}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Autonomy Status</div>
              <h4
                className="fw-bold mt-1 mb-0"
                style={{ color: globalKillSwitch ? '#dc2626' : '#16a34a' }}
              >
                {globalKillSwitch ? 'PAUSED' : 'ACTIVE (L4)'}
              </h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Business Signals</div>
              <h4 className="fw-bold text-primary mt-1 mb-0">{signals.length} Active</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Pending Decisions</div>
              <h4 className="fw-bold text-warning mt-1 mb-0">{pendingCount} Decisions</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Action Budget</div>
              <h4 className="fw-bold text-info mt-1 mb-0">
                {policy?.budgets?.maxActionsPerHour ?? 50} / hr max
              </h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'proposals')}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="proposals">Decision Proposals ({proposals.length})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="signals">Business Signals ({signals.length})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="policy">Autonomy Policies & Guardrails</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="proposals">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <div className="text-muted mt-2">Loading decision proposals...</div>
                  </div>
                ) : proposals.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <FiCheckCircle size={32} className="text-success mb-2" />
                    <p className="mb-0 fw-semibold">
                      No pending decision proposals in the pipeline.
                    </p>
                    <small>
                      Real-time autonomous recommendations from signals will populate here.
                    </small>
                  </div>
                ) : (
                  <Table responsive hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Decision ID</th>
                        <th>Objective</th>
                        <th>Action</th>
                        <th>Risk Level</th>
                        <th>Autonomy</th>
                        <th>Confidence</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals.map((p) => (
                        <tr key={p.decisionId}>
                          <td className="fw-bold">{p.decisionId}</td>
                          <td>
                            <Badge bg="secondary">{p.objective}</Badge>
                          </td>
                          <td>
                            <code>{p.actionName}</code>
                          </td>
                          <td>
                            <Badge
                              bg={
                                p.riskLevel === 'LOW'
                                  ? 'success'
                                  : p.riskLevel === 'MEDIUM'
                                    ? 'warning'
                                    : 'danger'
                              }
                            >
                              {p.riskLevel}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="info">L{p.autonomyLevel}</Badge>
                          </td>
                          <td>{((p.confidence || 0) * 100).toFixed(0)}%</td>
                          <td>
                            <Badge
                              bg={
                                p.status === 'PROPOSED'
                                  ? 'primary'
                                  : p.status === 'APPROVED'
                                    ? 'success'
                                    : 'warning'
                              }
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-info"
                                onClick={() => void handleSimulate(p.decisionId)}
                                disabled={simulatingId === p.decisionId}
                              >
                                {simulatingId === p.decisionId ? (
                                  <Spinner size="sm" animation="border" />
                                ) : (
                                  <FiPlay />
                                )}{' '}
                                Simulate
                              </Button>
                              <Button
                                size="sm"
                                variant="success"
                                disabled={
                                  globalKillSwitch ||
                                  actionLoading === p.decisionId ||
                                  p.status === 'APPROVED'
                                }
                                onClick={() => void handleApprove(p.decisionId)}
                              >
                                {actionLoading === p.decisionId ? (
                                  <Spinner size="sm" animation="border" />
                                ) : (
                                  <FiCheckCircle />
                                )}{' '}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                disabled={actionLoading === p.decisionId || p.status === 'REJECTED'}
                                onClick={() => void handleReject(p.decisionId)}
                              >
                                <FiXCircle /> Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="signals">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <div className="text-muted mt-2">Loading business signals...</div>
                  </div>
                ) : signals.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p className="mb-0 fw-semibold">No active business signals detected.</p>
                    <small>
                      Telemetry and anomaly events from Cart, Inventory, and Pricing will appear
                      here.
                    </small>
                  </div>
                ) : (
                  <Table responsive hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Signal ID</th>
                        <th>Type</th>
                        <th>Domain</th>
                        <th>Severity</th>
                        <th>Observed</th>
                        <th>Threshold</th>
                        <th>Detected At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.map((s) => (
                        <tr key={s.signalId}>
                          <td className="fw-bold">{s.signalId}</td>
                          <td>
                            <code>{s.signalType}</code>
                          </td>
                          <td>{s.sourceDomain}</td>
                          <td>
                            <Badge
                              bg={
                                s.severity === 'CRITICAL' || s.severity === 'HIGH'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {s.severity}
                            </Badge>
                          </td>
                          <td className="fw-bold">{s.observedValue}</td>
                          <td>{s.thresholdValue}</td>
                          <td className="text-muted small">
                            {s.createdAt ? new Date(s.createdAt).toLocaleString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="policy">
            <Card className="border-0 shadow-sm p-4">
              <h5 className="fw-bold mb-3">Bounded Autonomy Controls & Guardrails</h5>
              <p className="text-muted mb-3">Domain Autonomy Status:</p>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Badge
                    bg={
                      policy?.domainKillSwitches?.pricingAutonomy === false ? 'danger' : 'success'
                    }
                    className="p-2 w-100 text-center"
                  >
                    Pricing Autonomy:{' '}
                    {policy?.domainKillSwitches?.pricingAutonomy === false
                      ? 'MUTED'
                      : 'ENABLED (Bounded)'}
                  </Badge>
                </Col>
                <Col md={4}>
                  <Badge
                    bg={
                      policy?.domainKillSwitches?.inventoryAutonomy === false ? 'danger' : 'success'
                    }
                    className="p-2 w-100 text-center"
                  >
                    Inventory Autonomy:{' '}
                    {policy?.domainKillSwitches?.inventoryAutonomy === false ? 'MUTED' : 'ENABLED'}
                  </Badge>
                </Col>
                <Col md={4}>
                  <Badge
                    bg={
                      policy?.domainKillSwitches?.recommendationAutonomy === false
                        ? 'danger'
                        : 'success'
                    }
                    className="p-2 w-100 text-center"
                  >
                    Recommendation Autonomy:{' '}
                    {policy?.domainKillSwitches?.recommendationAutonomy === false
                      ? 'MUTED'
                      : 'ENABLED'}
                  </Badge>
                </Col>
              </Row>
              <Alert variant="warning" className="mb-0">
                <strong>Forbidden Actions Enforcement:</strong> Financial transfers, database drops,
                schema mutations, security downgrades, and user record deletions are hard-blocked at
                the architectural level.
              </Alert>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  )
}
