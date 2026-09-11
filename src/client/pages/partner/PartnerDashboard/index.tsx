import { useState } from 'react'
import { Container, Row, Col, Card, Badge, Button, Form, Alert } from 'react-bootstrap'
import { FiKey, FiGlobe, FiRadio, FiShield, FiCheckCircle, FiCopy } from 'react-icons/fi'

export default function PartnerDashboard() {
  const [copied, setCopied] = useState(false)
  const apiKey = 'truson_pk_9f82a1b4c3e5f6a7b8c9d0e1f2a3b4c5'

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
          <FiGlobe className="text-primary" /> Partner Developer Portal
        </h2>
        <p className="text-muted mb-0">
          Manage API Credentials, Webhook Endpoints & Scoped Access Permissions
        </p>
      </div>

      {copied && (
        <Alert variant="success" dismissible className="mb-4">
          <FiCheckCircle className="me-2" /> API Key copied to clipboard!
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FiKey className="text-warning" /> Scoped API Key Credentials
            </h5>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">Active API Key Secret</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control type="password" value={apiKey} readOnly />
                <Button variant="outline-secondary" onClick={handleCopy}>
                  <FiCopy /> Copy
                </Button>
              </div>
            </Form.Group>
            <div>
              <Form.Label className="small fw-bold text-muted d-block mb-2">
                Granted Access Scopes
              </Form.Label>
              <div className="d-flex gap-2">
                <Badge bg="primary">products:read</Badge>
                <Badge bg="primary">orders:read</Badge>
                <Badge bg="primary">inventory:read</Badge>
              </div>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FiRadio className="text-info" /> Webhook HMAC Signing Secret
            </h5>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">Target Webhook URL</Form.Label>
              <Form.Control type="text" value="https://partner.example.com/webhooks" readOnly />
            </Form.Group>
            <div>
              <Form.Label className="small fw-bold text-muted d-block mb-1">
                Signing Algorithm
              </Form.Label>
              <div className="fw-bold text-success">
                HMAC-SHA256 (Header: <code>X-Truson-Signature</code>)
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm p-4">
        <h5 className="fw-bold mb-2 d-flex align-items-center gap-2">
          <FiShield className="text-success" /> Zero-Trust Security & Quota Limits
        </h5>
        <p className="text-muted mb-0">
          Monthly Quota: <strong>100,000 requests/month</strong> (Used: 14,210). Rate limit:{' '}
          <strong>300 requests/minute</strong>. Cryptographic signatures prevent payload forgery and
          replay attacks.
        </p>
      </Card>
    </Container>
  )
}
