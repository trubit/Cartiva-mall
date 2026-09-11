import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap'
import {
  FiCpu,
  FiSearch,
  FiThumbsUp,
  FiThumbsDown,
  FiCheck,
  FiZap,
  FiCheckCircle,
} from 'react-icons/fi'
import api from '../../../services/api.js'

interface QueryResult {
  query: string
  summary: string
  confidenceScore: number
  dataPoints: Array<{ label: string; value: number | string }>
  explainableNotes: string
  suggestedActions: string[]
}

interface Insight {
  insightId: string
  scope: string
  title: string
  summary: string
  confidenceScore: number
  recommendedActions: string[]
  status: string
}

export default function AiBiDashboard() {
  const [queryInput, setQueryInput] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [querying, setQuerying] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const [insights, setInsights] = useState<Insight[]>([])
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({})

  const fetchInsights = async () => {
    setLoadingInsights(true)
    try {
      const res = await api.get('/ai-bi/insights')
      if (res.data?.success) {
        setInsights(res.data.data ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err)
    } finally {
      setLoadingInsights(false)
    }
  }

  useEffect(() => {
    void fetchInsights()
  }, [])

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryInput.trim()) return
    setQuerying(true)
    setQueryError(null)
    try {
      const res = await api.post('/ai-bi/query', { query: queryInput })
      if (res.data?.success) {
        setQueryResult(res.data.data)
      }
    } catch (err: unknown) {
      console.error('Failed to process NL query:', err)
      setQueryError('Failed to process natural language analytics query.')
    } finally {
      setQuerying(false)
    }
  }

  const handleFeedback = async (insightId: string, helpful: boolean) => {
    try {
      await api.post(`/ai-bi/insights/${insightId}/feedback`, { helpful })
      setFeedbackSent((prev) => ({ ...prev, [insightId]: true }))
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="mb-1 d-flex align-items-center gap-2">
          <FiCpu className="text-primary" /> AI Business Intelligence & Decision Support
        </h2>
        <p className="text-muted mb-0">
          Query natural-language marketplace analytics, inspect automated anomaly insights, and
          execute AI-guided business recommendations.
        </p>
      </div>

      {/* Natural Language Analytics Query Card */}
      <Card className="shadow-sm border-0 mb-4 bg-dark text-white">
        <Card.Body className="p-4">
          <h5 className="mb-3 d-flex align-items-center gap-2">
            <FiSearch /> Natural Language Analytics Query
          </h5>
          <Form onSubmit={(e) => void handleQuery(e)}>
            <Form.Group className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="e.g. Which products are low in inventory? or Show revenue trends..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="bg-secondary text-white border-0"
              />
              <Button type="submit" variant="warning" disabled={querying || !queryInput.trim()}>
                {querying ? <Spinner animation="border" size="sm" /> : 'Ask AI'}
              </Button>
            </Form.Group>
          </Form>

          {queryError && (
            <Alert variant="danger" className="mt-3">
              {queryError}
            </Alert>
          )}

          {queryResult && (
            <div className="mt-4 p-3 bg-secondary rounded text-white">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0 text-warning">{queryResult.summary}</h6>
                <Badge bg="info">Confidence: {queryResult.confidenceScore}%</Badge>
              </div>
              <p className="small text-light mb-3">{queryResult.explainableNotes}</p>

              <Row className="g-2 mb-3">
                {queryResult.dataPoints.map((dp, idx) => (
                  <Col md={6} key={idx}>
                    <div className="p-2 bg-dark rounded border border-secondary">
                      <span className="small text-muted">{dp.label}: </span>
                      <strong className="text-warning">{dp.value}</strong>
                    </div>
                  </Col>
                ))}
              </Row>

              <h6 className="small text-uppercase text-muted mb-2">Suggested Business Actions:</h6>
              <ul className="small mb-0 ps-3">
                {queryResult.suggestedActions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Automated Marketplace Insights */}
      <h4 className="mb-3 d-flex align-items-center gap-2">
        <FiZap className="text-warning" /> Automated Marketplace Insights
      </h4>

      {loadingInsights ? (
        <div className="text-center p-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : insights.length === 0 ? (
        <Alert variant="info" className="d-flex align-items-center gap-2">
          <FiCheckCircle /> All marketplace metrics are operating within normal thresholds.
        </Alert>
      ) : (
        <Row className="g-3">
          {insights.map((ins) => (
            <Col md={6} key={ins.insightId}>
              <Card className="shadow-sm border-0 h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Badge bg="primary" className="text-uppercase">
                      {ins.scope}
                    </Badge>
                    <Badge bg="success">Confidence: {ins.confidenceScore}%</Badge>
                  </div>
                  <Card.Title className="h5 mb-2">{ins.title}</Card.Title>
                  <Card.Text className="text-muted small mb-3">{ins.summary}</Card.Text>

                  <h6 className="small fw-bold text-uppercase text-muted mb-1">
                    Recommended Actions:
                  </h6>
                  <ul className="small mb-3 ps-3">
                    {ins.recommendedActions.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span className="small text-muted">Was this insight helpful?</span>
                    {feedbackSent[ins.insightId] ? (
                      <span className="small text-success d-flex align-items-center gap-1">
                        <FiCheck /> Feedback Recorded
                      </span>
                    ) : (
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => void handleFeedback(ins.insightId, true)}
                        >
                          <FiThumbsUp />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => void handleFeedback(ins.insightId, false)}
                        >
                          <FiThumbsDown />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
