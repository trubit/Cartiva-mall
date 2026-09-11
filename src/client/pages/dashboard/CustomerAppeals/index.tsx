import { useState } from 'react'
import { Card, Form, Button, Alert } from 'react-bootstrap'
import { FiShield, FiSend, FiCheckCircle } from 'react-icons/fi'
import api from '../../../services/api.js'

export default function CustomerAppeals() {
  const [caseIdInput, setCaseIdInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseIdInput.trim() || !notesInput.trim()) return
    setSubmitting(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await api.post('/risk/appeals', {
        caseId: caseIdInput.trim(),
        appealNotes: notesInput.trim(),
      })
      if (res.data?.success) {
        setSuccessMsg(
          'Your security appeal has been submitted successfully. A security operator will review your account.',
        )
        setCaseIdInput('')
        setNotesInput('')
      }
    } catch (err: unknown) {
      console.error('Failed to submit appeal:', err)
      setErrorMsg('Failed to submit appeal. Please verify Case ID and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="mb-4 text-center">
        <FiShield size={48} className="text-primary mb-2" />
        <h2>Account Security & Action Appeals</h2>
        <p className="text-muted">
          If your account or recent order was flagged or restricted by our security risk pipeline,
          you may submit a request for manual operator re-evaluation.
        </p>
      </div>

      {successMsg && (
        <Alert variant="success" className="d-flex align-items-center gap-2 mb-4">
          <FiCheckCircle size={24} /> {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" className="mb-4">
          {errorMsg}
        </Alert>
      )}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <Form onSubmit={(e) => void handleSubmit(e)}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Security Reference Case ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. case_123456789"
                value={caseIdInput}
                onChange={(e) => setCaseIdInput(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Enter the reference Case ID provided in your security notification.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Appeal Statement & Rationale</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Please describe why this transaction or account activity was legitimate..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              type="submit"
              variant="primary"
              className="w-100 d-flex align-items-center justify-content-center gap-2"
              disabled={submitting}
            >
              <FiSend /> {submitting ? 'Submitting Appeal...' : 'Submit Appeal for Operator Review'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
