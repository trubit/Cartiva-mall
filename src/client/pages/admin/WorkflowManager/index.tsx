import { useState, useCallback } from 'react'
import {
  Container,
  Row,
  Col,
  Card,
  Tab,
  Nav,
  Badge,
  Spinner,
  Alert,
  Button,
  Form,
  Modal,
  Table,
  ProgressBar,
} from 'react-bootstrap'
import {
  FiPlus,
  FiPlay,
  FiPause,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiThumbsUp,
  FiThumbsDown,
  FiBarChart2,
  FiFileText,
  FiRefreshCw,
  FiAlertTriangle,
  FiZap,
} from 'react-icons/fi'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  useWorkflows,
  useCreateWorkflow,
  usePublishWorkflow,
  usePauseWorkflow,
  useResumeWorkflow,
  useDeleteWorkflow,
  useExecuteWorkflow,
  useWorkflowExecutions,
  useWorkflowTemplates,
  useCreateTemplate,
  useInstantiateTemplate,
  useWorkflowApprovals,
  useProcessApproval,
  useGlobalWorkflowAnalytics,
} from '../../../hooks/useWorkflow.js'
import type {
  IWorkflow,
  IWorkflowExecution,
  IWorkflowTemplate,
  IWorkflowApproval,
  WorkflowStep,
  TriggerType,
} from '../../../../shared/types/workflow.types.js'

const statusColor: Record<string, string> = {
  draft: 'secondary',
  active: 'success',
  paused: 'warning',
  archived: 'dark',
}

const execStatusColor: Record<string, string> = {
  pending: 'secondary',
  running: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'dark',
}

const approvalStatusColor: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  escalated: 'info',
  expired: 'secondary',
}

const TRIGGER_TYPES: TriggerType[] = [
  'order_created',
  'order_paid',
  'order_shipped',
  'order_delivered',
  'low_stock',
  'payment_completed',
  'payment_failed',
  'vendor_registered',
  'vendor_approved',
  'return_requested',
  'refund_completed',
  'new_customer',
  'customer_inactive',
  'scheduled',
  'manual',
]

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const fmtMs = (ms: number) => {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Workflow Designer (React Flow) ──────────────────────────────────────────

function WorkflowDesigner({ steps }: { steps: WorkflowStep[] }) {
  const initialNodes: Node[] = steps.map((step, i) => ({
    id: step.id,
    position: { x: 100 + (i % 3) * 220, y: 80 + Math.floor(i / 3) * 120 },
    data: { label: `${step.name}\n(${step.type})` },
    type: 'default',
    style: {
      background:
        step.type === 'action'
          ? '#dbeafe'
          : step.type === 'condition'
            ? '#fef9c3'
            : step.type === 'approval'
              ? '#fce7f3'
              : '#dcfce7',
      border: '1px solid #d1d5db',
      borderRadius: 8,
      fontSize: 12,
      padding: '6px 10px',
      minWidth: 120,
    },
  }))

  const initialEdges: Edge[] = steps.flatMap((step) => {
    const edges: Edge[] = []
    if (step.nextStepId)
      edges.push({ id: `${step.id}-${step.nextStepId}`, source: step.id, target: step.nextStepId })
    if (step.conditionTrueStepId)
      edges.push({
        id: `${step.id}-true-${step.conditionTrueStepId}`,
        source: step.id,
        target: step.conditionTrueStepId,
        label: 'true',
        style: { stroke: '#16a34a' },
      })
    if (step.conditionFalseStepId)
      edges.push({
        id: `${step.id}-false-${step.conditionFalseStepId}`,
        source: step.id,
        target: step.conditionFalseStepId,
        label: 'false',
        style: { stroke: '#dc2626' },
      })
    return edges
  })

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  return (
    <div style={{ height: 380, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
      </ReactFlow>
    </div>
  )
}

// ── Global Analytics Panel ──────────────────────────────────────────────────

function GlobalAnalyticsPanel() {
  const q = useGlobalWorkflowAnalytics()
  const data = q.data as
    | {
        totalWorkflows: number
        activeWorkflows: number
        totalExecutions: number
        successRate: number
        avgDurationMs: number
        topWorkflows: Array<{ name: string; executionCount: number }>
      }
    | undefined

  if (q.isLoading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" style={{ color: '#FF9900' }} />
      </div>
    )
  if (!data)
    return (
      <div className="text-center py-5 text-muted" style={{ fontSize: 13 }}>
        No analytics data yet.
      </div>
    )

  return (
    <div>
      <Row className="g-3 mb-4">
        {[
          { label: 'Total Workflows', value: data.totalWorkflows },
          { label: 'Active', value: data.activeWorkflows },
          { label: 'Total Executions', value: data.totalExecutions },
          { label: 'Success Rate', value: `${(data.successRate ?? 0).toFixed(1)}%` },
          { label: 'Avg Duration', value: fmtMs(data.avgDurationMs) },
        ].map((s) => (
          <Col key={s.label} xs={6} md={4} xl>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body className="py-3">
                <div style={{ fontSize: 22, fontWeight: 700, color: '#FF9900' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {data.topWorkflows && data.topWorkflows.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Header style={{ background: '#fff', fontWeight: 600, fontSize: 14 }}>
            Top Workflows by Executions
          </Card.Header>
          <Card.Body className="p-0">
            <Table size="sm" hover className="mb-0">
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th>Workflow</th>
                  <th>Executions</th>
                  <th style={{ width: 200 }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.topWorkflows.map((wf) => {
                  const max = Math.max(...data.topWorkflows.map((w) => w.executionCount), 1)
                  return (
                    <tr key={wf.name}>
                      <td style={{ fontSize: 13 }}>{wf.name}</td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{wf.executionCount}</td>
                      <td>
                        <ProgressBar
                          now={(wf.executionCount / max) * 100}
                          style={{ height: 8 }}
                          variant="warning"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function WorkflowManager() {
  const [tab, setTab] = useState('workflows')
  const [showCreate, setShowCreate] = useState(false)
  const [showDesigner, setShowDesigner] = useState<IWorkflow | null>(null)
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [approvalDecide, setApprovalDecide] = useState<{
    approval: IWorkflowApproval
    decision: 'approved' | 'rejected'
  } | null>(null)
  const [approvalReason, setApprovalReason] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: 'manual' as TriggerType,
  })
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    triggerType: 'manual' as TriggerType,
  })

  const workflowsQ = useWorkflows()
  const executionsQ = useWorkflowExecutions()
  const templatesQ = useWorkflowTemplates()
  const approvalsQ = useWorkflowApprovals()

  const createMutation = useCreateWorkflow()
  const publishMutation = usePublishWorkflow()
  const pauseMutation = usePauseWorkflow()
  const resumeMutation = useResumeWorkflow()
  const deleteMutation = useDeleteWorkflow()
  const executeMutation = useExecuteWorkflow()
  const createTemplateMutation = useCreateTemplate()
  const instantiateMutation = useInstantiateTemplate()
  const processApprovalMutation = useProcessApproval()

  const workflows = (workflowsQ.data?.items ?? workflowsQ.data?.data ?? []) as IWorkflow[]
  const executions = (executionsQ.data?.items ??
    executionsQ.data?.data ??
    []) as IWorkflowExecution[]
  const templates = (
    Array.isArray(templatesQ.data) ? templatesQ.data : (templatesQ.data?.items ?? [])
  ) as IWorkflowTemplate[]
  const approvals = (approvalsQ.data?.items ?? approvalsQ.data?.data ?? []) as IWorkflowApproval[]

  const handleCreate = () => {
    if (!form.name.trim()) return
    createMutation.mutate(
      { name: form.name, description: form.description, triggerType: form.triggerType, steps: [] },
      {
        onSuccess: () => {
          setShowCreate(false)
          setForm({ name: '', description: '', triggerType: 'manual' })
        },
      },
    )
  }

  const handleCreateTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.category.trim()) return
    createTemplateMutation.mutate(
      {
        name: templateForm.name,
        description: templateForm.description,
        category: templateForm.category,
        triggerType: templateForm.triggerType,
        steps: [],
      },
      {
        onSuccess: () => {
          setShowCreateTemplate(false)
          setTemplateForm({ name: '', description: '', category: '', triggerType: 'manual' })
        },
      },
    )
  }

  const handleProcessApproval = () => {
    if (!approvalDecide) return
    processApprovalMutation.mutate(
      {
        id: approvalDecide.approval._id,
        decision: approvalDecide.decision,
        reason: approvalReason,
      },
      {
        onSuccess: () => {
          setApprovalDecide(null)
          setApprovalReason('')
        },
      },
    )
  }

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700 }}>
            Workflow Automation
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: 14 }}>
            Business process automation, approvals & analytics
          </p>
        </div>
        <div className="d-flex gap-2">
          {pendingApprovals.length > 0 && (
            <Badge bg="warning" style={{ fontSize: 12, display: 'flex', alignItems: 'center' }}>
              <FiAlertTriangle size={12} className="me-1" />
              {pendingApprovals.length} pending approval{pendingApprovals.length > 1 ? 's' : ''}
            </Badge>
          )}
          <Button
            onClick={() => setShowCreate(true)}
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
          >
            <FiPlus size={14} className="me-1" />
            New Workflow
          </Button>
        </div>
      </div>

      {workflowsQ.isError && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
          <FiAlertCircle />
          Workflow engine unavailable.
        </Alert>
      )}

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? 'workflows')}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="workflows">
              <FiZap size={13} className="me-1" />
              Workflows ({workflows.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="executions">
              <FiPlay size={13} className="me-1" />
              Executions ({executions.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="templates">
              <FiLayers size={13} className="me-1" />
              Templates ({templates.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="approvals">
              <FiCheckCircle size={13} className="me-1" />
              Approvals
              {pendingApprovals.length > 0 && (
                <Badge bg="warning" style={{ fontSize: 10, marginLeft: 6 }}>
                  {pendingApprovals.length}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="analytics">
              <FiBarChart2 size={13} className="me-1" />
              Analytics
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* ── Workflows ── */}
          <Tab.Pane eventKey="workflows">
            {workflowsQ.isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#FF9900' }} />
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-5">
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                <h5 style={{ fontWeight: 600 }}>No Workflows Yet</h5>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  Create a workflow or start from a template.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <Button
                    onClick={() => setShowCreate(true)}
                    style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                  >
                    <FiPlus size={14} className="me-1" />
                    Create Workflow
                  </Button>
                  <Button variant="outline-secondary" onClick={() => setTab('templates')}>
                    <FiLayers size={14} className="me-1" />
                    Browse Templates
                  </Button>
                </div>
              </div>
            ) : (
              <Row className="g-3">
                {workflows.map((wf) => (
                  <Col key={wf._id} xs={12} md={6} xl={4}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{wf.name}</div>
                          <Badge
                            bg={statusColor[wf.status] ?? 'secondary'}
                            style={{ fontSize: 11 }}
                          >
                            {wf.status}
                          </Badge>
                        </div>
                        {wf.description && (
                          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                            {wf.description}
                          </p>
                        )}
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                          Trigger: <strong>{wf.triggerType}</strong> · {wf.steps?.length ?? 0} steps
                          · v{wf.version}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                          Executions: {wf.executionCount ?? 0}
                          {wf.lastExecutedAt && ` · Last: ${fmtDate(wf.lastExecutedAt)}`}
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          {wf.steps && wf.steps.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              style={{ fontSize: 11 }}
                              onClick={() => setShowDesigner(wf)}
                            >
                              <FiFileText size={11} className="me-1" />
                              View Flow
                            </Button>
                          )}
                          {wf.status === 'draft' && (
                            <Button
                              size="sm"
                              style={{
                                background: '#16a34a',
                                border: 'none',
                                color: '#fff',
                                fontSize: 12,
                              }}
                              disabled={publishMutation.isPending}
                              onClick={() => publishMutation.mutate(wf._id)}
                            >
                              <FiCheckCircle size={12} className="me-1" />
                              Publish
                            </Button>
                          )}
                          {wf.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                style={{
                                  background: '#FF9900',
                                  border: 'none',
                                  color: '#fff',
                                  fontSize: 12,
                                }}
                                disabled={executeMutation.isPending}
                                onClick={() => executeMutation.mutate({ id: wf._id })}
                              >
                                <FiPlay size={12} className="me-1" />
                                Run
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-warning"
                                style={{ fontSize: 12 }}
                                disabled={pauseMutation.isPending}
                                onClick={() => pauseMutation.mutate(wf._id)}
                              >
                                <FiPause size={12} className="me-1" />
                                Pause
                              </Button>
                            </>
                          )}
                          {wf.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              style={{ fontSize: 12 }}
                              disabled={resumeMutation.isPending}
                              onClick={() => resumeMutation.mutate(wf._id)}
                            >
                              <FiRefreshCw size={12} className="me-1" />
                              Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline-danger"
                            style={{ fontSize: 12 }}
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(wf._id)}
                          >
                            <FiTrash2 size={12} className="me-1" />
                            Delete
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Tab.Pane>

          {/* ── Executions ── */}
          <Tab.Pane eventKey="executions">
            <Card className="border-0 shadow-sm">
              <Card.Header style={{ background: '#fff', fontWeight: 600 }}>
                Execution History
              </Card.Header>
              <Card.Body className="p-0">
                {executionsQ.isLoading ? (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <Table size="sm" hover className="mb-0">
                      <thead style={{ background: '#f9fafb' }}>
                        <tr>
                          <th>Workflow</th>
                          <th>Trigger</th>
                          <th>Status</th>
                          <th>Steps Done</th>
                          <th>Started</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((ex) => {
                          const duration =
                            ex.completedAt && ex.startedAt
                              ? fmtMs(
                                  new Date(ex.completedAt).getTime() -
                                    new Date(ex.startedAt).getTime(),
                                )
                              : '—'
                          return (
                            <tr key={ex._id}>
                              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                {String(ex.workflowId).slice(-8)}
                              </td>
                              <td style={{ fontSize: 12 }}>{ex.triggerType}</td>
                              <td>
                                <Badge
                                  bg={execStatusColor[ex.status] ?? 'secondary'}
                                  style={{ fontSize: 10 }}
                                >
                                  {ex.status}
                                </Badge>
                              </td>
                              <td style={{ fontSize: 12 }}>
                                {ex.stepsCompleted?.length ?? 0} /{' '}
                                {(ex.stepsCompleted?.length ?? 0) + (ex.stepsFailed?.length ?? 0)}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                {ex.startedAt ? fmtDate(ex.startedAt) : <FiClock size={12} />}
                              </td>
                              <td style={{ fontSize: 12 }}>{duration}</td>
                            </tr>
                          )
                        })}
                        {executions.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="text-center py-4 text-muted"
                              style={{ fontSize: 13 }}
                            >
                              No executions yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Templates ── */}
          <Tab.Pane eventKey="templates">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                {templates.length} templates available
              </span>
              <Button
                size="sm"
                style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                onClick={() => setShowCreateTemplate(true)}
              >
                <FiPlus size={14} className="me-1" />
                New Template
              </Button>
            </div>
            {templatesQ.isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#FF9900' }} />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FiLayers size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14 }}>No workflow templates yet.</div>
              </div>
            ) : (
              <Row className="g-3">
                {templates.map((tpl) => (
                  <Col key={tpl._id} xs={12} md={6} xl={4}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{tpl.name}</div>
                          {tpl.isPublic && (
                            <Badge bg="info" style={{ fontSize: 10 }}>
                              public
                            </Badge>
                          )}
                        </div>
                        {tpl.description && (
                          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            {tpl.description}
                          </p>
                        )}
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                          Category: <strong>{tpl.category}</strong> · Trigger:{' '}
                          <strong>{tpl.triggerType}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
                          {tpl.steps.length} steps · Used {tpl.usageCount} time
                          {tpl.usageCount !== 1 ? 's' : ''}
                        </div>
                        {tpl.tags && tpl.tags.length > 0 && (
                          <div
                            className="mb-10 d-flex flex-wrap gap-1"
                            style={{ marginBottom: 10 }}
                          >
                            {tpl.tags.map((tag) => (
                              <Badge key={tag} bg="light" text="dark" style={{ fontSize: 10 }}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          style={{
                            background: '#FF9900',
                            border: 'none',
                            color: '#fff',
                            fontSize: 12,
                          }}
                          disabled={instantiateMutation.isPending}
                          onClick={() => instantiateMutation.mutate({ id: tpl._id })}
                        >
                          <FiZap size={11} className="me-1" />
                          Use Template
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Tab.Pane>

          {/* ── Approvals ── */}
          <Tab.Pane eventKey="approvals">
            <Card className="border-0 shadow-sm">
              <Card.Header
                style={{ background: '#fff', fontWeight: 600 }}
                className="d-flex justify-content-between align-items-center"
              >
                Approval Queue
                {pendingApprovals.length > 0 && (
                  <Badge bg="warning" style={{ fontSize: 11 }}>
                    {pendingApprovals.length} pending
                  </Badge>
                )}
              </Card.Header>
              <Card.Body className="p-0">
                {approvalsQ.isLoading ? (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <Table size="sm" hover className="mb-0">
                      <thead style={{ background: '#f9fafb' }}>
                        <tr>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Due</th>
                          <th>Created</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvals.map((ap) => (
                          <tr key={ap._id}>
                            <td style={{ fontSize: 13 }}>
                              <div style={{ fontWeight: 600 }}>{ap.title}</div>
                              {ap.description && (
                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                  {ap.description}
                                </div>
                              )}
                            </td>
                            <td>
                              <Badge
                                bg={approvalStatusColor[ap.status] ?? 'secondary'}
                                style={{ fontSize: 10 }}
                              >
                                {ap.status}
                              </Badge>
                            </td>
                            <td style={{ fontSize: 12 }}>{ap.dueAt ? fmtDate(ap.dueAt) : '—'}</td>
                            <td style={{ fontSize: 12 }}>{fmtDate(ap.createdAt)}</td>
                            <td>
                              {ap.status === 'pending' && (
                                <div className="d-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline-success"
                                    style={{ fontSize: 11, padding: '1px 8px' }}
                                    onClick={() =>
                                      setApprovalDecide({ approval: ap, decision: 'approved' })
                                    }
                                  >
                                    <FiThumbsUp size={10} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    style={{ fontSize: 11, padding: '1px 8px' }}
                                    onClick={() =>
                                      setApprovalDecide({ approval: ap, decision: 'rejected' })
                                    }
                                  >
                                    <FiThumbsDown size={10} />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {approvals.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center py-4 text-muted"
                              style={{ fontSize: 13 }}
                            >
                              No approvals in queue
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Analytics ── */}
          <Tab.Pane eventKey="analytics">
            <GlobalAnalyticsPanel />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* ── Create Workflow Modal ── */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Create Workflow</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Name *</Form.Label>
            <Form.Control
              size="sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Order confirmation workflow"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Description</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What does this workflow do?"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Trigger Event *</Form.Label>
            <Form.Select
              size="sm"
              value={form.triggerType}
              onChange={(e) =>
                setForm((f) => ({ ...f, triggerType: e.target.value as TriggerType }))
              }
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={handleCreate}
            disabled={createMutation.isPending || !form.name.trim()}
          >
            {createMutation.isPending ? <Spinner size="sm" /> : 'Create Workflow'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Create Template Modal ── */}
      <Modal show={showCreateTemplate} onHide={() => setShowCreateTemplate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Create Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Template Name *</Form.Label>
            <Form.Control
              size="sm"
              value={templateForm.name}
              onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Order Fulfillment Template"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Category *</Form.Label>
            <Form.Control
              size="sm"
              value={templateForm.category}
              onChange={(e) => setTemplateForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. ecommerce, finance, hr"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Description</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={2}
              value={templateForm.description}
              onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Trigger Type</Form.Label>
            <Form.Select
              size="sm"
              value={templateForm.triggerType}
              onChange={(e) =>
                setTemplateForm((f) => ({ ...f, triggerType: e.target.value as TriggerType }))
              }
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowCreateTemplate(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={handleCreateTemplate}
            disabled={
              createTemplateMutation.isPending ||
              !templateForm.name.trim() ||
              !templateForm.category.trim()
            }
          >
            {createTemplateMutation.isPending ? <Spinner size="sm" /> : 'Create Template'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Approval Decision Modal ── */}
      <Modal show={!!approvalDecide} onHide={() => setApprovalDecide(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>
            {approvalDecide?.decision === 'approved' ? (
              <span style={{ color: '#16a34a' }}>
                <FiThumbsUp className="me-2" />
                Approve Request
              </span>
            ) : (
              <span style={{ color: '#dc2626' }}>
                <FiThumbsDown className="me-2" />
                Reject Request
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
            <strong>{approvalDecide?.approval.title}</strong>
          </p>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>
              Reason {approvalDecide?.decision === 'rejected' ? '(required)' : '(optional)'}
            </Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={3}
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="Provide a reason for your decision…"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setApprovalDecide(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{
              background: approvalDecide?.decision === 'approved' ? '#16a34a' : '#dc2626',
              border: 'none',
              color: '#fff',
            }}
            onClick={handleProcessApproval}
            disabled={
              processApprovalMutation.isPending ||
              (approvalDecide?.decision === 'rejected' && !approvalReason.trim())
            }
          >
            {processApprovalMutation.isPending ? (
              <Spinner size="sm" />
            ) : approvalDecide?.decision === 'approved' ? (
              'Approve'
            ) : (
              'Reject'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Workflow Designer Modal ── */}
      <Modal show={!!showDesigner} onHide={() => setShowDesigner(null)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>
            <FiFileText className="me-2" style={{ color: '#FF9900' }} />
            {showDesigner?.name} — Flow Diagram
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showDesigner && showDesigner.steps && showDesigner.steps.length > 0 ? (
            <WorkflowDesigner steps={showDesigner.steps} />
          ) : (
            <div className="text-center py-5 text-muted" style={{ fontSize: 13 }}>
              This workflow has no steps yet.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div style={{ fontSize: 12, color: '#9ca3af', flex: 1 }}>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: '#dbeafe',
                border: '1px solid #d1d5db',
                borderRadius: 2,
                marginRight: 4,
              }}
            />
            Action
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: '#fef9c3',
                border: '1px solid #d1d5db',
                borderRadius: 2,
                marginRight: 4,
                marginLeft: 10,
              }}
            />
            Condition
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: '#fce7f3',
                border: '1px solid #d1d5db',
                borderRadius: 2,
                marginRight: 4,
                marginLeft: 10,
              }}
            />
            Approval
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: '#dcfce7',
                border: '1px solid #d1d5db',
                borderRadius: 2,
                marginRight: 4,
                marginLeft: 10,
              }}
            />
            Delay
          </div>
          <Button variant="light" size="sm" onClick={() => setShowDesigner(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
