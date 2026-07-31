import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Alert from 'react-bootstrap/Alert'
import {
  RETURN_REASONS,
  RETURN_REASON_LABELS,
  type ReturnReason,
} from '../../../../shared/constants/index.js'
import { useRequestReturn } from '../../../hooks/useOrders.js'
import { useOrderStore } from '../../../store/orderStore.js'

interface ReturnRequestFormProps {
  orderId: string
  show: boolean
  onHide: () => void
}

export default function ReturnRequestForm({ orderId, show, onHide }: ReturnRequestFormProps) {
  const [reason, setReason] = useState<ReturnReason | ''>('')
  const [description, setDescription] = useState('')

  const returnStatus = useOrderStore((s) => s.returnStatus)
  const returnError = useOrderStore((s) => s.returnError)
  const setReturnStatus = useOrderStore((s) => s.setReturnStatus)
  const setReturnError = useOrderStore((s) => s.setReturnError)
  const { mutate: requestReturn } = useRequestReturn()

  // Reset stale state every time the modal is opened (different orders, re-opens)
  useEffect(() => {
    if (show) {
      setReturnStatus('idle')
      setReturnError(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason('')
      setDescription('')
    }
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  const descriptionValid = description.length === 0 || description.length >= 10
  const canSubmit = reason !== '' && descriptionValid && returnStatus !== 'submitting'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return
    requestReturn(
      { orderId, reason, description: description || undefined },
      {
        onSuccess: () => {
          setTimeout(onHide, 1500)
        },
      },
    )
  }

  const handleClose = () => {
    if (returnStatus === 'submitting') return
    setReason('')
    setDescription('')
    onHide()
  }

  return (
    <Modal show={show} onHide={handleClose} centered className="return-form-modal">
      <Modal.Header closeButton>
        <Modal.Title>Request a Return</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {returnStatus === 'success' ? (
          <Alert variant="success" className="mb-0">
            <strong>Return request submitted!</strong> Our team will review it within 1–2 business
            days.
          </Alert>
        ) : (
          <Form id="return-form" onSubmit={handleSubmit} noValidate>
            {returnStatus === 'error' && returnError && (
              <Alert variant="danger">{returnError}</Alert>
            )}

            <Form.Group className="mb-3" controlId="return-reason">
              <Form.Label>
                Reason for return <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                required
              >
                <option value="">Select a reason…</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {RETURN_REASON_LABELS[r]}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-1" controlId="return-description">
              <Form.Label>
                Additional details <span className="text-muted">(optional)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Describe the issue in more detail (minimum 10 characters if provided)…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                isInvalid={!descriptionValid}
              />
              <Form.Control.Feedback type="invalid">
                Please provide at least 10 characters.
              </Form.Control.Feedback>
              <Form.Text muted>{description.length} chars</Form.Text>
            </Form.Group>
          </Form>
        )}
      </Modal.Body>

      {returnStatus !== 'success' && (
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={handleClose}
            disabled={returnStatus === 'submitting'}
          >
            Cancel
          </Button>
          <Button variant="danger" type="submit" form="return-form" disabled={!canSubmit}>
            {returnStatus === 'submitting' ? 'Submitting…' : 'Submit Return Request'}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  )
}
