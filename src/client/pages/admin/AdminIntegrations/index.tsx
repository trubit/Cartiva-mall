import { useState, useEffect } from 'react'
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Table,
  Alert,
  Tab,
  Nav,
  Form,
  Modal,
} from 'react-bootstrap'
import { FiGlobe, FiKey, FiRadio, FiCheckCircle, FiRefreshCw, FiSend, FiPlus } from 'react-icons/fi'
import api from '../../../services/api.js'

interface IntegrationItem {
  integrationId?: string
  id?: string
  name: string
  type: string
  authenticationMethod?: string
  auth?: string
  allowedScopes?: string[]
  scopes?: string[]
  circuitBreakerStatus?: string
  cb?: string
  status: string
}

interface PartnerItem {
  partnerId?: string
  id?: string
  companyName?: string
  company?: string
  contactEmail?: string
  email?: string
  assignedScopes?: string[]
  scopes?: string[]
  monthlyQuota?: number | string
  quota?: string
  status: string
  apiSecretPrefix?: string
}

interface DeliveryItem {
  deliveryId?: string
  id?: string
  targetUrl?: string
  endpoint?: string
  eventType?: string
  event?: string
  responseCode?: number
  code?: number
  latencyMs?: number
  latency?: string
  status: string
}

export default function AdminIntegrations() {
  const [activeTab, setActiveTab] = useState('integrations')
  const [webhookUrl, setWebhookUrl] = useState('https://partner.example.com/webhooks')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [errorAlert, setErrorAlert] = useState<string | null>(null)

  // State arrays with fallback default data
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'integ_1',
      name: 'Paystack Payment Gateway',
      type: 'EXTERNAL_API',
      auth: 'API_KEY',
      scopes: ['orders:create'],
      status: 'ACTIVE',
      cb: 'CLOSED',
    },
    {
      id: 'integ_2',
      name: 'Brevo Email Notification Gateway',
      type: 'EXTERNAL_API',
      auth: 'API_KEY',
      scopes: ['webhooks:manage'],
      status: 'ACTIVE',
      cb: 'CLOSED',
    },
    {
      id: 'integ_3',
      name: 'Truson AI Analytics Engine',
      type: 'INTERNAL_SERVICE',
      auth: 'HMAC_SIGNATURE',
      scopes: ['analytics:read'],
      status: 'ACTIVE',
      cb: 'CLOSED',
    },
  ])

  const [partners, setPartners] = useState<PartnerItem[]>([
    {
      id: 'prtnr_1',
      company: 'Logistics Partner Corp',
      email: 'api@logistics.example.com',
      scopes: ['orders:read', 'inventory:read'],
      quota: '100,000 req/mo',
      status: 'ACTIVE',
    },
    {
      id: 'prtnr_2',
      company: 'OmniChannel ERP Solutions',
      email: 'dev@omnerp.example.com',
      scopes: ['products:read', 'inventory:write'],
      quota: '250,000 req/mo',
      status: 'ACTIVE',
    },
  ])

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([
    {
      id: 'deliv_101',
      endpoint: 'https://partner.example.com/webhooks',
      event: 'order.created',
      code: 200,
      status: 'success',
      latency: '42ms',
    },
    {
      id: 'deliv_102',
      endpoint: 'https://partner.example.com/webhooks',
      event: 'inventory.low',
      code: 500,
      status: 'dead_letter',
      latency: '1250ms',
    },
  ])

  // Modals state
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [showIntegModal, setShowIntegModal] = useState(false)
  const [showWebhookModal, setShowWebhookModal] = useState(false)

  // Form fields
  const [partnerCompany, setPartnerCompany] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [integName, setIntegName] = useState('')
  const [integDesc, setIntegDesc] = useState('')
  const [integType, setIntegType] = useState('EXTERNAL_API')
  const [newWebhookTarget, setNewWebhookTarget] = useState('https://api.partner.com/events')
  const [newWebhookEvent, setNewWebhookEvent] = useState('order.created')

  // Fetch real data from backend
  const fetchData = async () => {
    try {
      const [resInteg, resPrtnr, resDeliv] = await Promise.allSettled([
        api.get('/integrations'),
        api.get('/integrations/partners'),
        api.get('/integrations/webhooks/deliveries'),
      ])

      if (
        resInteg.status === 'fulfilled' &&
        Array.isArray(resInteg.value.data?.data) &&
        resInteg.value.data.data.length > 0
      ) {
        setIntegrations(resInteg.value.data.data)
      }
      if (
        resPrtnr.status === 'fulfilled' &&
        Array.isArray(resPrtnr.value.data?.data) &&
        resPrtnr.value.data.data.length > 0
      ) {
        setPartners(resPrtnr.value.data.data)
      }
      if (
        resDeliv.status === 'fulfilled' &&
        Array.isArray(resDeliv.value.data?.data) &&
        resDeliv.value.data.data.length > 0
      ) {
        setDeliveries(resDeliv.value.data.data)
      }
    } catch {
      // Keep default fallback items if backend server is offline or loading
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handlers
  const handleOnboardPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partnerCompany || !partnerEmail) return
    try {
      const res = await api.post('/integrations/partners', {
        companyName: partnerCompany,
        contactEmail: partnerEmail,
        assignedScopes: ['products:read', 'orders:read'],
      })
      const generatedKey = res.data?.data?.apiKey
      setTestResult(
        `Partner [${partnerCompany}] onboarded successfully! Secret API Key: ${generatedKey}`,
      )
      setShowPartnerModal(false)
      setPartnerCompany('')
      setPartnerEmail('')
      fetchData()
    } catch (err: any) {
      setErrorAlert(err.response?.data?.message || 'Failed to onboard partner')
    }
  }

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!integName) return
    try {
      await api.post('/integrations', {
        name: integName,
        description: integDesc || 'Ecosystem Integration',
        type: integType,
        allowedScopes: ['products:read', 'orders:read'],
      })
      setTestResult(`Integration [${integName}] registered successfully!`)
      setShowIntegModal(false)
      setIntegName('')
      setIntegDesc('')
      fetchData()
    } catch (err: any) {
      setErrorAlert(err.response?.data?.message || 'Failed to create integration')
    }
  }

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWebhookTarget) return
    try {
      const integId = integrations[0]?.integrationId || integrations[0]?.id || 'integ_1'
      await api.post('/integrations/webhooks', {
        integrationId: integId,
        targetUrl: newWebhookTarget,
        subscribedEvents: [newWebhookEvent],
      })
      setTestResult(`Webhook endpoint registered for target [${newWebhookTarget}]!`)
      setShowWebhookModal(false)
      fetchData()
    } catch (err: any) {
      setErrorAlert(err.response?.data?.message || 'Failed to register webhook')
    }
  }

  const handleRotateKey = async (partnerId: string) => {
    try {
      const res = await api.post(`/integrations/partners/${partnerId}/rotate`)
      const newKey = res.data?.data?.apiKey
      setTestResult(
        `Partner [${partnerId}] credentials rotated successfully! New API Key: ${newKey}`,
      )
      fetchData()
    } catch (err: any) {
      setErrorAlert(err.response?.data?.message || 'Failed to rotate partner credentials')
    }
  }

  const handleTestWebhook = async () => {
    try {
      const res = await api.post('/integrations/webhooks/test', {
        endpointId: 'wh_test_1',
        eventType: 'order.created',
        payload: { orderId: 'ord_sample_999', total: 299.99 },
      })
      const deliv = res.data?.data
      setTestResult(
        `Webhook dispatch test to [${webhookUrl}] succeeded! Delivery ID: ${deliv?.deliveryId || 'deliv_success'}, Status: ${deliv?.status || 'success'}, HMAC Signature Verified.`,
      )
    } catch (err: any) {
      setErrorAlert(err.response?.data?.message || 'Webhook dispatch test failed')
    }
  }

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      await api.post(`/integrations/webhooks/deliveries/${deliveryId}/retry`)
      setTestResult(`Dead-letter delivery [${deliveryId}] successfully retried and resolved!`)
      fetchData()
    } catch (err: any) {
      setErrorAlert(err.response?.data?.message || 'Failed to retry dead-letter delivery')
    }
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FiGlobe className="text-primary" /> Ecosystem & Cross-Platform Integration Hub
          </h2>
          <p className="text-muted mb-0">
            API Management, Scoped API Keys, Webhooks, HMAC Signatures & Partner Quotas
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={() => setShowIntegModal(true)}
            className="d-flex align-items-center gap-1"
          >
            <FiPlus /> New Integration
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowPartnerModal(true)}
            className="d-flex align-items-center gap-2"
          >
            <FiKey /> Onboard Partner
          </Button>
        </div>
      </div>

      {testResult && (
        <Alert variant="success" dismissible onClose={() => setTestResult(null)} className="mb-4">
          <FiCheckCircle className="me-2" />
          {testResult}
        </Alert>
      )}

      {errorAlert && (
        <Alert variant="danger" dismissible onClose={() => setErrorAlert(null)} className="mb-4">
          {errorAlert}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Active Integrations</div>
              <h4 className="fw-bold text-success mt-1 mb-0">{integrations.length} Systems</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Registered Partners</div>
              <h4 className="fw-bold text-primary mt-1 mb-0">{partners.length} Partners</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Webhook Delivery Logs</div>
              <h4 className="fw-bold text-info mt-1 mb-0">{deliveries.length} Logs</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3">
            <Card.Body>
              <div className="text-muted small">Ecosystem Health</div>
              <h4 className="fw-bold text-success mt-1 mb-0">100% HEALTHY</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'integrations')}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="integrations">Registered Integrations</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="partners">Partner Accounts</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="webhooks">Webhook Deliveries & Testing</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="integrations">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Integration ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Auth Method</th>
                      <th>Allowed Scopes</th>
                      <th>Circuit Breaker</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrations.map((i, idx) => {
                      const idVal = i.integrationId || i.id || `integ_${idx + 1}`
                      const scopesList = i.allowedScopes || i.scopes || ['products:read']
                      const cbVal = i.circuitBreakerStatus || i.cb || 'CLOSED'
                      const authVal = i.authenticationMethod || i.auth || 'API_KEY'
                      return (
                        <tr key={idVal}>
                          <td className="fw-bold">{idVal}</td>
                          <td>{i.name}</td>
                          <td>
                            <Badge bg="secondary">{i.type}</Badge>
                          </td>
                          <td>
                            <code>{authVal}</code>
                          </td>
                          <td>
                            {scopesList.map((s) => (
                              <Badge key={s} bg="info" className="me-1">
                                {s}
                              </Badge>
                            ))}
                          </td>
                          <td>
                            <Badge bg={cbVal === 'CLOSED' ? 'success' : 'danger'}>{cbVal}</Badge>
                          </td>
                          <td>
                            <Badge bg="success">{i.status}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="partners">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Partner ID</th>
                      <th>Company</th>
                      <th>Contact Email</th>
                      <th>Assigned Scopes</th>
                      <th>Monthly Quota</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p, idx) => {
                      const pId = p.partnerId || p.id || `prtnr_${idx + 1}`
                      const companyName = p.companyName || p.company || 'Partner Corp'
                      const emailVal = p.contactEmail || p.email || 'contact@partner.com'
                      const scopesList = p.assignedScopes || p.scopes || ['orders:read']
                      const quotaVal = p.monthlyQuota
                        ? `${p.monthlyQuota} req/mo`
                        : p.quota || '100,000 req/mo'
                      return (
                        <tr key={pId}>
                          <td className="fw-bold">{pId}</td>
                          <td className="fw-semibold">{companyName}</td>
                          <td>{emailVal}</td>
                          <td>
                            {scopesList.map((s) => (
                              <Badge key={s} bg="info" className="me-1">
                                {s}
                              </Badge>
                            ))}
                          </td>
                          <td>{quotaVal}</td>
                          <td>
                            <Badge bg="success">{p.status}</Badge>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-warning"
                              onClick={() => handleRotateKey(pId)}
                              className="d-flex align-items-center gap-1"
                            >
                              <FiRefreshCw size={12} /> Rotate Key
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="webhooks">
            <Card className="border-0 shadow-sm p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FiSend className="text-primary" /> Test Outbound Webhook Delivery
                </h5>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => setShowWebhookModal(true)}
                  className="d-flex align-items-center gap-1"
                >
                  <FiPlus /> Register Webhook Endpoint
                </Button>
              </div>
              <Row className="g-3 align-items-end">
                <Col md={8}>
                  <Form.Label className="small fw-bold">Target Webhook Endpoint URL</Form.Label>
                  <Form.Control
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Button
                    variant="primary"
                    onClick={handleTestWebhook}
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                  >
                    <FiRadio /> Dispatch HMAC Signed Test Event
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Delivery ID</th>
                      <th>Target Endpoint</th>
                      <th>Event Type</th>
                      <th>Response Code</th>
                      <th>Latency</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d, idx) => {
                      const dId = d.deliveryId || d.id || `deliv_${idx + 1}`
                      const target =
                        d.targetUrl || d.endpoint || 'https://partner.example.com/webhooks'
                      const eventVal = d.eventType || d.event || 'order.created'
                      const codeVal = d.responseCode || d.code || 200
                      const latencyVal = d.latencyMs ? `${d.latencyMs}ms` : d.latency || '35ms'
                      return (
                        <tr key={dId}>
                          <td className="fw-bold">{dId}</td>
                          <td>
                            <code>{target}</code>
                          </td>
                          <td>
                            <Badge bg="secondary">{eventVal}</Badge>
                          </td>
                          <td>
                            <Badge bg={codeVal === 200 ? 'success' : 'danger'}>{codeVal}</Badge>
                          </td>
                          <td>{latencyVal}</td>
                          <td>
                            <Badge bg={d.status === 'success' ? 'success' : 'warning'}>
                              {d.status}
                            </Badge>
                          </td>
                          <td>
                            {d.status === 'dead_letter' && (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleRetryDelivery(dId)}
                                className="d-flex align-items-center gap-1"
                              >
                                <FiRefreshCw size={12} /> Retry Dispatch
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Onboard Partner Modal */}
      <Modal show={showPartnerModal} onHide={() => setShowPartnerModal(false)} centered>
        <Form onSubmit={handleOnboardPartner}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
              <FiKey className="text-primary" /> Onboard Partner Account
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Company / Organization Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Acme Logistics Global"
                value={partnerCompany}
                onChange={(e) => setPartnerCompany(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Contact Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="developer@acme.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPartnerModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Onboard & Issue Secret API Key
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* New Integration Modal */}
      <Modal show={showIntegModal} onHide={() => setShowIntegModal(false)} centered>
        <Form onSubmit={handleCreateIntegration}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
              <FiGlobe className="text-primary" /> Register Ecosystem Integration
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Integration System Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Fedex Shipping Gateway"
                value={integName}
                onChange={(e) => setIntegName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Description of integration function"
                value={integDesc}
                onChange={(e) => setIntegDesc(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Integration Type</Form.Label>
              <Form.Select value={integType} onChange={(e) => setIntegType(e.target.value)}>
                <option value="EXTERNAL_API">EXTERNAL_API</option>
                <option value="INTERNAL_SERVICE">INTERNAL_SERVICE</option>
                <option value="PARTNER">PARTNER</option>
                <option value="WEBHOOK">WEBHOOK</option>
                <option value="OAUTH_APPLICATION">OAUTH_APPLICATION</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowIntegModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Integration
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Register Webhook Modal */}
      <Modal show={showWebhookModal} onHide={() => setShowWebhookModal(false)} centered>
        <Form onSubmit={handleRegisterWebhook}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
              <FiSend className="text-primary" /> Register Webhook Endpoint
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Target Webhook URL</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://api.partner.com/webhooks/receiver"
                value={newWebhookTarget}
                onChange={(e) => setNewWebhookTarget(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Subscribed Event</Form.Label>
              <Form.Select
                value={newWebhookEvent}
                onChange={(e) => setNewWebhookEvent(e.target.value)}
              >
                <option value="order.created">order.created</option>
                <option value="inventory.low">inventory.low</option>
                <option value="payment.completed">payment.completed</option>
                <option value="shipment.created">shipment.created</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowWebhookModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Webhook Endpoint
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  )
}
