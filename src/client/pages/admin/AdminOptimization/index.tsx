import { useState, useEffect } from 'react'
import { Card, Table, Badge, Button, Modal, Form, Spinner, Alert, Row, Col } from 'react-bootstrap'
import { FiCpu, FiRefreshCw, FiZap, FiCheckCircle, FiRotateCcw, FiShield } from 'react-icons/fi'
import api from '../../../services/api.js'

interface Target {
  targetKey: string
  name: string
  category: string
  currentValue: number
  unit: string
  minSafeValue: number
  maxSafeValue: number
  autoApplyEnabled: boolean
  description?: string
}

interface Proposal {
  proposalId: string
  targetKey: string
  currentValue: number
  proposedValue: number
  expectedGain: string
  riskScore: number
  status: 'PROPOSED' | 'EVALUATING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'ROLLED_BACK'
  rationale: string
  appliedAt?: string
  rolledBackAt?: string
  rollbackReason?: string
}

export default function AdminOptimization() {
  const [targets, setTargets] = useState<Target[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [showRollbackModal, setShowRollbackModal] = useState(false)
  const [rollbackReason, setRollbackReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [targetsRes, proposalsRes] = await Promise.all([
        api.get('/optimization/targets'),
        api.get('/optimization/proposals'),
      ])
      if (targetsRes.data?.success) {
        setTargets(targetsRes.data.data ?? [])
      }
      if (proposalsRes.data?.success) {
        setProposals(proposalsRes.data.data ?? [])
      }
    } catch (err: unknown) {
      console.error('Failed to fetch optimization data:', err)
      setError('Failed to load self-optimization platform data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    try {
      await api.post('/optimization/scan')
      void fetchData()
    } catch (err: any) {
      console.error('Failed to trigger scan:', err)
      setError(err.response?.data?.message || 'Failed to trigger opportunity scan.')
    } finally {
      setScanning(false)
    }
  }

  const handleApply = async (proposalId: string) => {
    setProcessing(true)
    setError(null)
    try {
      const res = await api.patch(`/optimization/proposals/${proposalId}/apply`)
      if (res.data?.success) {
        void fetchData()
      }
    } catch (err: any) {
      console.error('Failed to apply optimization proposal:', err)
      setError(err.response?.data?.message || 'Failed to apply proposal. Verify safety boundaries.')
    } finally {
      setProcessing(false)
    }
  }

  const handleOpenRollback = (p: Proposal) => {
    setSelectedProposal(p)
    setRollbackReason('')
    setShowRollbackModal(true)
  }

  const handleExecuteRollback = async () => {
    if (!selectedProposal) return
    setProcessing(true)
    setError(null)
    try {
      const res = await api.post(
        `/optimization/proposals/${selectedProposal.proposalId}/rollback`,
        {
          reason: rollbackReason || 'Operator triggered manual rollback',
        },
      )
      if (res.data?.success) {
        setShowRollbackModal(false)
        void fetchData()
      }
    } catch (err: any) {
      console.error('Failed to rollback proposal:', err)
      setError(err.response?.data?.message || 'Failed to execute rollback.')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return <Badge bg="success">APPLIED</Badge>
      case 'PROPOSED':
        return (
          <Badge bg="warning" text="dark">
            PROPOSED
          </Badge>
        )
      case 'ROLLED_BACK':
        return <Badge bg="danger">ROLLED_BACK</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 d-flex align-items-center gap-2">
            <FiCpu className="text-primary" /> Self-Optimization & Adaptive Intelligence Platform
          </h2>
          <p className="text-muted mb-0">
            Observe platform latency & queue performance, review AI-generated proposals, and execute
            pre-approved parameter optimizations with instant rollback capability.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleScan()} disabled={scanning}>
            <FiZap /> {scanning ? 'Scanning...' : 'Scan Opportunities'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4 mb-4">
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-light fw-bold d-flex align-items-center gap-2">
              <FiShield className="text-primary" /> Pre-Approved Operational Optimization Targets
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <Table responsive hover className="align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Target Key</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Current Value</th>
                      <th>Safe Range</th>
                      <th>Auto-Apply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => (
                      <tr key={t.targetKey}>
                        <td>
                          <code>{t.targetKey}</code>
                        </td>
                        <td>{t.name}</td>
                        <td>
                          <Badge bg="info" className="text-uppercase">
                            {t.category}
                          </Badge>
                        </td>
                        <td>
                          <strong>{t.currentValue}</strong> {t.unit}
                        </td>
                        <td>
                          {t.minSafeValue} – {t.maxSafeValue} {t.unit}
                        </td>
                        <td>
                          <Badge bg={t.autoApplyEnabled ? 'success' : 'secondary'}>
                            {t.autoApplyEnabled ? 'ENABLED' : 'MANUAL_ONLY'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-light fw-bold d-flex align-items-center gap-2">
          <FiZap className="text-warning" /> Optimization Proposals & Experiment Pipeline
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center p-4 text-muted">
              <FiCheckCircle size={36} className="text-success mb-2" />
              <p className="mb-0">
                No active optimization proposals. Platform is operating efficiently.
              </p>
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Proposal ID</th>
                  <th>Target Parameter</th>
                  <th>Value Change</th>
                  <th>Expected Gain</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => (
                  <tr key={p.proposalId}>
                    <td>
                      <code>{p.proposalId}</code>
                    </td>
                    <td>
                      <code>{p.targetKey}</code>
                    </td>
                    <td>
                      {p.currentValue} → <strong>{p.proposedValue}</strong>
                    </td>
                    <td className="small text-success fw-bold">{p.expectedGain}</td>
                    <td>
                      <Badge bg={p.riskScore <= 30 ? 'success' : 'warning'}>
                        {p.riskScore}/100 Risk
                      </Badge>
                    </td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td>
                      {p.status === 'PROPOSED' && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => void handleApply(p.proposalId)}
                          disabled={processing}
                        >
                          Apply Proposal
                        </Button>
                      )}
                      {p.status === 'APPLIED' && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleOpenRollback(p)}
                          disabled={processing}
                        >
                          <FiRotateCcw /> Rollback
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Rollback Modal */}
      <Modal show={showRollbackModal} onHide={() => setShowRollbackModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rollback Optimization Proposal — {selectedProposal?.proposalId}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProposal && (
            <Form>
              <p className="text-muted small mb-3">
                Rolling back will restore target parameter <code>{selectedProposal.targetKey}</code>{' '}
                to its previous value (<code>{selectedProposal.currentValue}</code>).
              </p>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Rollback Rationale / Trigger Reason</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  placeholder="Explain why this proposal is being rolled back (e.g. latency degradation)..."
                  required
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRollbackModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleExecuteRollback()}
            disabled={processing}
          >
            {processing ? 'Rolling Back...' : 'Execute Rollback'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
