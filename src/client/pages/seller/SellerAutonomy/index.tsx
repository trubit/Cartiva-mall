import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap'
import { FiCpu, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

export default function SellerAutonomy() {
  const recommendations = [
    {
      id: 'rec_1',
      type: 'Restock Alert',
      title: 'High Demand Expected for Smart Tablet Phone',
      impact: '+18% Sales Retention',
      confidence: '94%',
      risk: 'LOW',
    },
    {
      id: 'rec_2',
      type: 'Pricing Opportunity',
      title: 'Optimal Campaign Discount Eligibility',
      impact: '+12% Conversion Rate',
      confidence: '89%',
      risk: 'LOW',
    },
  ]

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
          <FiCpu className="text-primary" /> Seller Autonomous Insights
        </h2>
        <p className="text-muted mb-0">
          AI-driven operational insights, demand forecasts, and bounded reorder recommendations
        </p>
      </div>

      <Row className="mb-4">
        {recommendations.map((r) => (
          <Col md={6} key={r.id}>
            <Card className="border-0 shadow-sm h-100 p-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Badge bg="primary">{r.type}</Badge>
                  <Badge bg="success">Risk: {r.risk}</Badge>
                </div>
                <h5 className="fw-bold">{r.title}</h5>
                <div className="text-success fw-semibold mb-3">Expected Impact: {r.impact}</div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">AI Confidence: {r.confidence}</span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="d-flex align-items-center gap-1"
                  >
                    <FiCheckCircle /> Apply Recommendation
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm p-4">
        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <FiAlertCircle className="text-info" /> Autonomous Guardrails & Privacy Guarantee
        </h5>
        <p className="text-muted mb-0">
          All autonomous recommendations are strictly scoped to your seller store catalog. No
          competitor store data or platform financial access is exposed or modified.
        </p>
      </Card>
    </Container>
  )
}
