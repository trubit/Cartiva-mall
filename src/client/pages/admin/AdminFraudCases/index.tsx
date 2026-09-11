import { useState, useEffect } from 'react'
import { Card, Table, Badge, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap'
import { FiShield, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import api from '../../../services/api.js'

interface RiskCase {
  caseId: string
  subjectType: string
  subjectId: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number
  status: string
  reasonCodes: string[]
  resolution?: string
  moderatorNotes?: string
  createdAt: string
}

export default function AdminFraudCases() {
  const [cases, setCases] = useState<RiskCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<RiskCase | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [statusInput, setStatusInput] = useState('RESOLVED')
  const [resolutionInput, setResolutionInput] = useState('NO_ISSUE')
  const [notesInput, setNotesInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCases = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/risk/cases')
      if (res.data?.success) {
        setCases(res.data.data ?? [])
      }
    } catch (err: unknown) {
      console.error('Failed to fetch risk cases:', err)
      setError('Failed to load risk cases. Ensure administrative privileges.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCases()
  }, [])

  const handleOpenModal = (c: RiskCase) => {
    setSelectedCase(c)
    setModalError(null)
    setStatusInput(c.status === 'OPEN' ? 'RESOLVED' : c.status)
    setResolutionInput(c.resolution ?? 'NO_ISSUE')
    setNotesInput(c.moderatorNotes ?? '')
    setShowModal(true)
  }

  const handleSaveCase = async () => {
    if (!selectedCase) return
    setSubmitting(true)
    try {
      const res = await api.patch(`/risk/cases/${selectedCase.caseId}`, {
        status: statusInput,
        resolution: resolutionInput,
        moderatorNotes: notesInput,
      })
      if (res.data?.success) {
        setShowModal(false)
        void fetchCases()
      }
    } catch (err: any) {
      console.error('Failed to update case:', err)
      setModalError(err.response?.data?.message || 'Failed to update risk case.')
    } finally {
      setSubmitting(false)
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge bg="danger">CRITICAL</Badge>
      case 'HIGH':
        return (
          <Badge bg="warning" text="dark">
            HIGH
          </Badge>
        )
      case 'MEDIUM':
        return <Badge bg="info">MEDIUM</Badge>
      default:
        return <Badge bg="secondary">LOW</Badge>
    }
  }

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 d-flex align-items-center gap-2">
            <FiShield className="text-primary" /> Risk & Fraud Case Management
          </h2>
          <p className="text-muted mb-0">
            Inspect transaction anomalies, review flagged accounts, and enforce risk decisions.
          </p>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => void fetchCases()}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading risk cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center p-5 text-muted">
              <FiCheckCircle size={40} className="text-success mb-2" />
              <p className="mb-0">No active risk or fraud cases found.</p>
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Case ID</th>
                  <th>Subject</th>
                  <th>Risk Level</th>
                  <th>Risk Score</th>
                  <th>Reason Codes</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.caseId}>
                    <td>
                      <code>{c.caseId}</code>
                    </td>
                    <td>
                      <span className="text-uppercase fw-bold text-muted me-1">
                        {c.subjectType}:
                      </span>
                      <code>{c.subjectId}</code>
                    </td>
                    <td>{getRiskBadge(c.riskLevel)}</td>
                    <td>
                      <span className="fw-bold">{c.riskScore}</span> / 100
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {c.reasonCodes.map((code) => (
                          <Badge key={code} bg="light" text="dark" className="border">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge bg={c.status === 'OPEN' ? 'warning' : 'success'}>{c.status}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleOpenModal(c)}
                      >
                        Inspect & Resolve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Case Resolution Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Risk Case Details — {selectedCase?.caseId}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger" className="mb-3">
              {modalError}
            </Alert>
          )}
          {selectedCase && (
            <Form>
              <div className="mb-3 p-3 bg-light rounded">
                <div>
                  <strong>Subject:</strong> {selectedCase.subjectType} ({selectedCase.subjectId})
                </div>
                <div>
                  <strong>Risk Level:</strong> {selectedCase.riskLevel} ({selectedCase.riskScore}
                  /100)
                </div>
                <div>
                  <strong>Triggers:</strong> {selectedCase.reasonCodes.join(', ')}
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Investigation Status</Form.Label>
                <Form.Select value={statusInput} onChange={(e) => setStatusInput(e.target.value)}>
                  <option value="OPEN">OPEN</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Resolution Verdict</Form.Label>
                <Form.Select
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                >
                  <option value="NO_ISSUE">NO_ISSUE</option>
                  <option value="LEGITIMATE_ACTIVITY">LEGITIMATE_ACTIVITY</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="MONITORED">MONITORED</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Moderator Investigation Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Provide detailed rationale for case resolution..."
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSaveCase()} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Resolution'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
