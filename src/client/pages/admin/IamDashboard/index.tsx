import { useState } from 'react'
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
  InputGroup,
} from 'react-bootstrap'
import {
  FiShield,
  FiAlertCircle,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiUserCheck,
  FiLock,
  FiAlertTriangle,
  FiInfo,
  FiGlobe,
  FiCheckCircle,
  FiXCircle,
  FiCopy,
} from 'react-icons/fi'
import {
  useIamSummary,
  useRoles,
  usePermissions,
  useAssignments,
  useSecurityPolicies,
  useSecurityEvents,
  useCreateRole,
  useDeleteRole,
  useCreatePolicy,
  useDeletePolicy,
  useAssignRole,
  useRevokeRole,
  useOrganizations,
  useCreateOrganization,
  useAddOrgMember,
  useRemoveOrgMember,
  useTeams,
  useCreateTeam,
  useDeleteTeam,
  useAllSessions,
  useRevokeSession,
  useRevokeAllUserSessions,
  useSetupMfa,
  useVerifyMfa,
  useDisableMfa,
  useMfaStatus,
  useRiskEvents,
  useResolveRiskEvent,
  useComplianceReports,
  useGenerateComplianceReport,
} from '../../../hooks/useIam.js'
import type {
  IRole,
  IPermission,
  ISecurityPolicy,
  ISecurityEvent,
  IUserRoleAssignment,
  IOrganization,
  ITeam,
  ISession,
  IRiskEvent,
  IComplianceReport,
  ComplianceReportType,
} from '../../../../shared/types/iam.types.js'

const severityColor: Record<string, string> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
}

const riskLevelColor: Record<string, string> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'dark',
}

const severityIcon = (s: string) => {
  if (s === 'critical') return <FiAlertCircle size={14} />
  if (s === 'warning') return <FiAlertTriangle size={14} />
  return <FiInfo size={14} />
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="d-flex align-items-center gap-3">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{value.toLocaleString()}</div>
        </div>
      </Card.Body>
    </Card>
  )
}

// ── MFA Setup Wizard ──────────────────────────────────────────────────────────

function MfaPanel({ targetUserId }: { targetUserId?: string }) {
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'codes'>('status')
  const [token, setToken] = useState('')
  const [setupData, setSetupData] = useState<{
    qrCode: string
    recoveryCodes: string[]
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const statusQ = useMfaStatus(targetUserId)
  const setupMutation = useSetupMfa()
  const verifyMutation = useVerifyMfa()
  const disableMutation = useDisableMfa()

  const status = statusQ.data

  const handleSetup = () => {
    setupMutation.mutate(targetUserId, {
      onSuccess: (data) => {
        if (data) {
          setSetupData({ qrCode: data.qrCode, recoveryCodes: data.recoveryCodes })
          setStep('setup')
        }
      },
    })
  }

  const handleVerify = () => {
    verifyMutation.mutate(
      { token, userId: targetUserId },
      {
        onSuccess: () => {
          setStep('codes')
          setToken('')
          statusQ.refetch()
        },
      },
    )
  }

  const handleCopyCodes = () => {
    if (!setupData) return
    navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (statusQ.isLoading)
    return (
      <div className="text-center py-4">
        <Spinner size="sm" />
      </div>
    )

  return (
    <div style={{ maxWidth: 480 }}>
      {step === 'status' && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <FiShield size={28} style={{ color: status?.isEnabled ? '#16a34a' : '#6b7280' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  MFA {targetUserId ? `for user ${targetUserId.slice(-6)}` : '(current admin)'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {status?.isEnabled ? 'TOTP authenticator enabled' : 'Not configured'}
                </div>
              </div>
              <Badge
                bg={status?.isEnabled ? 'success' : 'secondary'}
                style={{ marginLeft: 'auto' }}
              >
                {status?.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            {status?.isEnabled && status.enabledAt && (
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                Enabled: {fmtDate(status.enabledAt)} · {status.recoveryCodesRemaining ?? 0} recovery
                codes remaining
              </div>
            )}
            <div className="d-flex gap-2">
              {!status?.isEnabled && (
                <Button
                  size="sm"
                  style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                  onClick={handleSetup}
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? <Spinner size="sm" /> : 'Set Up MFA'}
                </Button>
              )}
              {status?.isEnabled && (
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() =>
                    disableMutation.mutate(targetUserId, {
                      onSuccess: () => statusQ.refetch(),
                    })
                  }
                  disabled={disableMutation.isPending}
                >
                  {disableMutation.isPending ? <Spinner size="sm" /> : 'Disable MFA'}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {step === 'setup' && setupData && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <h6 style={{ fontWeight: 700, marginBottom: 12 }}>Step 1 — Scan QR Code</h6>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code
              below.
            </p>
            <div className="text-center mb-3">
              <img
                src={setupData.qrCode}
                alt="MFA QR Code"
                style={{ width: 200, height: 200, border: '1px solid #e5e7eb', borderRadius: 8 }}
              />
            </div>
            <h6 style={{ fontWeight: 700, marginBottom: 8 }}>Step 2 — Enter TOTP Code</h6>
            <InputGroup size="sm" className="mb-3">
              <Form.Control
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: 4,
                  fontSize: 18,
                  textAlign: 'center',
                }}
              />
            </InputGroup>
            <div className="d-flex gap-2">
              <Button variant="light" size="sm" onClick={() => setStep('status')}>
                Back
              </Button>
              <Button
                size="sm"
                style={{ background: '#16a34a', border: 'none', color: '#fff' }}
                onClick={handleVerify}
                disabled={token.length < 6 || verifyMutation.isPending}
              >
                {verifyMutation.isPending ? <Spinner size="sm" /> : 'Verify & Enable'}
              </Button>
            </div>
            {verifyMutation.isError && (
              <Alert variant="danger" className="mt-2 py-1 px-2" style={{ fontSize: 12 }}>
                Invalid code. Please try again.
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}

      {step === 'codes' && setupData && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <div
              className="d-flex align-items-center gap-2 mb-3"
              style={{ color: '#16a34a', fontWeight: 700 }}
            >
              <FiCheckCircle size={20} />
              MFA Enabled Successfully!
            </div>
            <Alert variant="warning" style={{ fontSize: 12 }}>
              Save these recovery codes in a secure location. Each code can only be used once.
            </Alert>
            <div
              className="enterprise-stat-box"
              style={{
                borderRadius: 8,
                padding: 12,
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 2,
                marginBottom: 12,
              }}
            >
              {setupData.recoveryCodes.map((code) => (
                <div key={code}>{code}</div>
              ))}
            </div>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" onClick={handleCopyCodes}>
                <FiCopy size={12} className="me-1" />
                {copied ? 'Copied!' : 'Copy Codes'}
              </Button>
              <Button
                size="sm"
                style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                onClick={() => setStep('status')}
              >
                Done
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}

// ── Sessions Panel ────────────────────────────────────────────────────────────

function SessionsPanel() {
  const sessionsQ = useAllSessions()
  const revokeSessionMutation = useRevokeSession()
  const revokeAllMutation = useRevokeAllUserSessions()
  const [targetUser, setTargetUser] = useState('')

  const sessions = (sessionsQ.data?.items ?? []) as ISession[]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span style={{ fontSize: 14, color: '#6b7280' }}>
          {sessionsQ.data?.total ?? 0} active sessions
        </span>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            size="sm"
            placeholder="User ID to revoke all…"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            style={{ width: 200, fontFamily: 'monospace', fontSize: 12 }}
          />
          <Button
            size="sm"
            variant="outline-danger"
            disabled={!targetUser.trim() || revokeAllMutation.isPending}
            onClick={() =>
              revokeAllMutation.mutate(targetUser, { onSuccess: () => setTargetUser('') })
            }
          >
            Revoke All
          </Button>
        </div>
      </div>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {sessionsQ.isLoading ? (
            <div className="text-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table size="sm" hover className="mb-0">
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th>User</th>
                    <th>IP</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Expires</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontSize: 11, fontFamily: 'monospace' }}>
                        {String(s.userId).slice(-8)}
                      </td>
                      <td style={{ fontSize: 12 }}>{s.ip ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {s.userAgent ? s.userAgent.slice(0, 30) + '…' : '—'}
                      </td>
                      <td>
                        <Badge bg={s.isActive ? 'success' : 'secondary'} style={{ fontSize: 10 }}>
                          {s.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(s.lastSeenAt)}</td>
                      <td style={{ fontSize: 12 }}>{fmtDate(s.expiresAt)}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          style={{ fontSize: 11, padding: '1px 8px' }}
                          disabled={revokeSessionMutation.isPending}
                          onClick={() => revokeSessionMutation.mutate(s._id)}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-4 text-muted"
                        style={{ fontSize: 13 }}
                      >
                        No active sessions
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

// ── Risk Events Panel ─────────────────────────────────────────────────────────

function RiskPanel() {
  const [riskLevel, setRiskLevel] = useState<string | undefined>()
  const riskQ = useRiskEvents(1, riskLevel)
  const resolveMutation = useResolveRiskEvent()

  const events = (riskQ.data?.items ?? []) as IRiskEvent[]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2 align-items-center">
          <span style={{ fontSize: 13, color: '#6b7280' }}>Filter:</span>
          {([undefined, 'low', 'medium', 'high', 'critical'] as (string | undefined)[]).map((l) => (
            <Button
              key={l ?? 'all'}
              size="sm"
              variant={riskLevel === l ? 'warning' : 'outline-secondary'}
              style={
                riskLevel === l
                  ? { background: '#FF9900', border: 'none', color: '#fff', fontSize: 12 }
                  : { fontSize: 12 }
              }
              onClick={() => setRiskLevel(l)}
            >
              {l ?? 'all'}
            </Button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{riskQ.data?.total ?? 0} total</span>
      </div>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {riskQ.isLoading ? (
            <div className="text-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table size="sm" hover className="mb-0">
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th>Risk Level</th>
                    <th>Score</th>
                    <th>Event Type</th>
                    <th>User</th>
                    <th>IP</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev._id}>
                      <td>
                        <Badge
                          bg={riskLevelColor[ev.riskLevel] ?? 'secondary'}
                          style={{ fontSize: 10 }}
                        >
                          {ev.riskLevel}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 700 }}>{ev.riskScore}</td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{ev.eventType}</td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>
                        {ev.userId ? String(ev.userId).slice(-8) : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{ev.ip ?? '—'}</td>
                      <td>
                        <Badge bg={ev.resolved ? 'success' : 'warning'} style={{ fontSize: 10 }}>
                          {ev.resolved ? 'resolved' : 'open'}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(ev.createdAt)}</td>
                      <td>
                        {!ev.resolved && (
                          <Button
                            size="sm"
                            variant="outline-success"
                            style={{ fontSize: 11, padding: '1px 8px' }}
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate(ev._id)}
                          >
                            <FiCheckCircle size={11} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-4 text-muted"
                        style={{ fontSize: 13 }}
                      >
                        No risk events found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

// ── Compliance Panel ──────────────────────────────────────────────────────────

const REPORT_TYPES: { value: ComplianceReportType; label: string }[] = [
  { value: 'access_review', label: 'Access Review' },
  { value: 'permission_audit', label: 'Permission Audit' },
  { value: 'session_audit', label: 'Session Audit' },
  { value: 'security_events', label: 'Security Events' },
  { value: 'mfa_compliance', label: 'MFA Compliance' },
  { value: 'data_retention', label: 'Data Retention' },
]

function CompliancePanel() {
  const [showGenerate, setShowGenerate] = useState(false)
  const [form, setForm] = useState({
    type: 'access_review' as ComplianceReportType,
    title: '',
    periodStart: '',
    periodEnd: '',
  })

  const reportsQ = useComplianceReports()
  const generateMutation = useGenerateComplianceReport()

  const reports = (reportsQ.data?.items ?? []) as IComplianceReport[]

  const statusColors: Record<string, string> = {
    pending: 'warning',
    generating: 'info',
    completed: 'success',
    failed: 'danger',
  }

  const handleGenerate = () => {
    if (!form.title.trim() || !form.periodStart || !form.periodEnd) return
    generateMutation.mutate(form, {
      onSuccess: () => {
        setShowGenerate(false)
        setForm({ type: 'access_review', title: '', periodStart: '', periodEnd: '' })
      },
    })
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span style={{ fontSize: 14, color: '#6b7280' }}>{reports.length} compliance reports</span>
        <Button
          size="sm"
          style={{ background: '#FF9900', border: 'none', color: '#fff' }}
          onClick={() => setShowGenerate(true)}
        >
          <FiPlus size={14} className="me-1" />
          Generate Report
        </Button>
      </div>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {reportsQ.isLoading ? (
            <div className="text-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table size="sm" hover className="mb-0">
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Summary</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r._id}>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</td>
                      <td>
                        <Badge bg="light" text="dark" style={{ fontSize: 10 }}>
                          {r.type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>
                        {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
                      </td>
                      <td>
                        <Badge bg={statusColors[r.status] ?? 'secondary'} style={{ fontSize: 10 }}>
                          {r.status === 'generating' && (
                            <Spinner size="sm" style={{ width: 8, height: 8, marginRight: 4 }} />
                          )}
                          {r.status}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>
                        {r.summary || (r.status === 'pending' ? 'Queued…' : '—')}
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-4 text-muted"
                        style={{ fontSize: 13 }}
                      >
                        No compliance reports generated yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showGenerate} onHide={() => setShowGenerate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Generate Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Report Type *</Form.Label>
            <Form.Select
              size="sm"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as ComplianceReportType }))
              }
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Report Title *</Form.Label>
            <Form.Control
              size="sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Q3 2025 Access Review"
            />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Period Start *</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={form.periodStart}
                  onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Period End *</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={form.periodEnd}
                  onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowGenerate(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={handleGenerate}
            disabled={
              generateMutation.isPending ||
              !form.title.trim() ||
              !form.periodStart ||
              !form.periodEnd
            }
          >
            {generateMutation.isPending ? <Spinner size="sm" /> : 'Generate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ── Organizations Panel ───────────────────────────────────────────────────────

function OrganizationsPanel() {
  const [showCreate, setShowCreate] = useState(false)
  const [addMember, setAddMember] = useState<{ orgId: string; userId: string } | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgDesc, setOrgDesc] = useState('')

  const orgsQ = useOrganizations()
  const createMutation = useCreateOrganization()
  const addMemberMutation = useAddOrgMember()
  useRemoveOrgMember()

  const orgs = (orgsQ.data ?? []) as IOrganization[]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span style={{ fontSize: 14, color: '#6b7280' }}>{orgs.length} organizations</span>
        <Button
          size="sm"
          style={{ background: '#FF9900', border: 'none', color: '#fff' }}
          onClick={() => setShowCreate(true)}
        >
          <FiPlus size={14} className="me-1" />
          New Organization
        </Button>
      </div>
      {orgsQ.isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" style={{ color: '#FF9900' }} />
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <FiGlobe size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>No organizations created yet.</div>
        </div>
      ) : (
        <Row className="g-3">
          {orgs.map((org) => (
            <Col key={org._id} xs={12} md={6} xl={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between mb-1">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</div>
                    <Badge bg={org.isActive ? 'success' : 'secondary'} style={{ fontSize: 10 }}>
                      {org.isActive ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                    /{org.slug} · {org.memberIds.length} member
                    {org.memberIds.length !== 1 ? 's' : ''}
                  </div>
                  {org.description && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                      {org.description}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    style={{ fontSize: 11 }}
                    onClick={() => setAddMember({ orgId: org._id, userId: '' })}
                  >
                    <FiPlus size={11} className="me-1" />
                    Add Member
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>New Organization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Name *</Form.Label>
            <Form.Control
              size="sm"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Description</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={2}
              value={orgDesc}
              onChange={(e) => setOrgDesc(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={() =>
              createMutation.mutate(
                { name: orgName, description: orgDesc },
                {
                  onSuccess: () => {
                    setShowCreate(false)
                    setOrgName('')
                    setOrgDesc('')
                  },
                },
              )
            }
            disabled={createMutation.isPending || !orgName.trim()}
          >
            {createMutation.isPending ? <Spinner size="sm" /> : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!addMember} onHide={() => setAddMember(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Add Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>User ID *</Form.Label>
            <Form.Control
              size="sm"
              value={addMember?.userId ?? ''}
              onChange={(e) => setAddMember((m) => m && { ...m, userId: e.target.value })}
              placeholder="MongoDB ObjectId"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setAddMember(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={() => {
              if (!addMember?.userId.trim()) return
              addMemberMutation.mutate(
                { orgId: addMember.orgId, userId: addMember.userId },
                { onSuccess: () => setAddMember(null) },
              )
            }}
            disabled={addMemberMutation.isPending || !addMember?.userId.trim()}
          >
            {addMemberMutation.isPending ? <Spinner size="sm" /> : 'Add'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ── Teams Panel ───────────────────────────────────────────────────────────────

function TeamsPanel() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', organizationId: '' })
  const orgsQ = useOrganizations()
  const teamsQ = useTeams()
  const createMutation = useCreateTeam()
  const deleteMutation = useDeleteTeam()

  const teams = (teamsQ.data ?? []) as ITeam[]
  const orgs = (orgsQ.data ?? []) as IOrganization[]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span style={{ fontSize: 14, color: '#6b7280' }}>{teams.length} teams</span>
        <Button
          size="sm"
          style={{ background: '#FF9900', border: 'none', color: '#fff' }}
          onClick={() => setShowCreate(true)}
        >
          <FiPlus size={14} className="me-1" />
          New Team
        </Button>
      </div>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {teamsQ.isLoading ? (
            <div className="text-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <Table size="sm" hover className="mb-0">
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th>Name</th>
                  <th>Organization</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  const org = typeof t.organizationId === 'object' ? t.organizationId : null
                  return (
                    <tr key={t._id}>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</td>
                      <td style={{ fontSize: 12 }}>
                        {org ? (org as IOrganization).name : String(t.organizationId).slice(-8)}
                      </td>
                      <td style={{ fontSize: 12 }}>{t.memberIds.length}</td>
                      <td>
                        <Badge bg={t.isActive ? 'success' : 'secondary'} style={{ fontSize: 10 }}>
                          {t.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          style={{ fontSize: 11, padding: '1px 8px' }}
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(t._id)}
                        >
                          <FiTrash2 size={11} />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {teams.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-4 text-muted"
                      style={{ fontSize: 13 }}
                    >
                      No teams yet
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>New Team</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Team Name *</Form.Label>
            <Form.Control
              size="sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Engineering"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Organization *</Form.Label>
            <Form.Select
              size="sm"
              value={form.organizationId}
              onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
            >
              <option value="">Select organization…</option>
              {orgs.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Description</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={() =>
              createMutation.mutate(
                {
                  name: form.name,
                  description: form.description,
                  organizationId: form.organizationId,
                },
                {
                  onSuccess: () => {
                    setShowCreate(false)
                    setForm({ name: '', description: '', organizationId: '' })
                  },
                },
              )
            }
            disabled={createMutation.isPending || !form.name.trim() || !form.organizationId}
          >
            {createMutation.isPending ? <Spinner size="sm" /> : 'Create Team'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ── Permission Matrix ─────────────────────────────────────────────────────────

function PermissionMatrix({ permissions }: { permissions: IPermission[]; roles: IRole[] }) {
  const resources = [...new Set(permissions.map((p) => p.resource))].sort()
  const actions = [...new Set(permissions.map((p) => p.action))].sort()

  return (
    <div style={{ overflowX: 'auto' }}>
      <Table bordered size="sm" style={{ fontSize: 11, minWidth: 600 }}>
        <thead style={{ background: '#f9fafb' }}>
          <tr>
            <th>Resource</th>
            {actions.map((a) => (
              <th key={a} style={{ textAlign: 'center', textTransform: 'capitalize' }}>
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource}>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{resource}</td>
              {actions.map((action) => {
                const exists = permissions.some(
                  (p) => p.resource === resource && p.action === action,
                )
                return (
                  <td key={action} style={{ textAlign: 'center' }}>
                    {exists ? (
                      <FiCheckCircle size={12} style={{ color: '#16a34a' }} />
                    ) : (
                      <FiXCircle size={12} style={{ color: '#d1d5db' }} />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </Table>
      {resources.length === 0 && (
        <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
          No permissions configured yet.
        </div>
      )}
    </div>
  )
}

// ── Main IamDashboard ─────────────────────────────────────────────────────────

export default function IamDashboard() {
  const [tab, setTab] = useState('overview')
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [showCreatePolicy, setShowCreatePolicy] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [roleForm, setRoleForm] = useState({ name: '', description: '' })
  const [policyForm, setPolicyForm] = useState({
    name: '',
    type: 'ip_allowlist' as ISecurityPolicy['type'],
    rules: '{}',
    appliesTo: 'all' as ISecurityPolicy['appliesTo'],
  })
  const [assignForm, setAssignForm] = useState({ userId: '', roleId: '' })
  const [eventSeverity, setEventSeverity] = useState<string | undefined>()

  const summaryQ = useIamSummary()
  const rolesQ = useRoles()
  const permissionsQ = usePermissions()
  const assignmentsQ = useAssignments()
  const policiesQ = useSecurityPolicies()
  const eventsQ = useSecurityEvents(1, eventSeverity)

  const createRoleMutation = useCreateRole()
  const deleteRoleMutation = useDeleteRole()
  const createPolicyMutation = useCreatePolicy()
  const deletePolicyMutation = useDeletePolicy()
  const assignMutation = useAssignRole()
  const revokeMutation = useRevokeRole()

  const summary = summaryQ.data
  const roles = (rolesQ.data ?? []) as IRole[]
  const permissions = (permissionsQ.data ?? []) as IPermission[]
  const assignments = (assignmentsQ.data?.items ?? []) as IUserRoleAssignment[]
  const policies = (policiesQ.data ?? []) as ISecurityPolicy[]
  const events = (eventsQ.data?.items ?? []) as ISecurityEvent[]

  const handleCreateRole = () => {
    if (!roleForm.name.trim()) return
    createRoleMutation.mutate(
      { name: roleForm.name, description: roleForm.description, permissions: [] },
      {
        onSuccess: () => {
          setShowCreateRole(false)
          setRoleForm({ name: '', description: '' })
        },
      },
    )
  }

  const handleCreatePolicy = () => {
    if (!policyForm.name.trim()) return
    let rules: Record<string, unknown> = {}
    try {
      rules = JSON.parse(policyForm.rules)
    } catch {
      // keep default empty object
    }
    createPolicyMutation.mutate(
      { name: policyForm.name, type: policyForm.type, rules, appliesTo: policyForm.appliesTo },
      {
        onSuccess: () => {
          setShowCreatePolicy(false)
          setPolicyForm({ name: '', type: 'ip_allowlist', rules: '{}', appliesTo: 'all' })
        },
      },
    )
  }

  const handleAssignRole = () => {
    if (!assignForm.userId.trim() || !assignForm.roleId) return
    assignMutation.mutate(assignForm, {
      onSuccess: () => {
        setShowAssign(false)
        setAssignForm({ userId: '', roleId: '' })
      },
    })
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'roles', label: 'Roles' },
    { key: 'permissions', label: 'Permissions' },
    { key: 'matrix', label: 'Permission Matrix' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'policies', label: 'Policies' },
    { key: 'events', label: 'Events' },
    { key: 'organizations', label: 'Organizations' },
    { key: 'teams', label: 'Teams' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'mfa', label: 'MFA' },
    { key: 'risk', label: 'Risk Events' },
    { key: 'compliance', label: 'Compliance' },
  ]

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700 }}>
            Identity & Access Management
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: 14 }}>
            Roles, permissions, organizations, MFA, sessions & compliance
          </p>
        </div>
        {summary && summary.criticalEvents > 0 && (
          <Alert
            variant="danger"
            className="d-flex align-items-center gap-2 mb-0 py-2 px-3"
            style={{ fontSize: 13 }}
          >
            <FiAlertCircle size={14} />
            {summary.criticalEvents} critical security event
            {summary.criticalEvents > 1 ? 's' : ''} in the last 24h
          </Alert>
        )}
      </div>

      {summaryQ.isError && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
          <FiAlertCircle />
          IAM service unavailable.
        </Alert>
      )}

      {summary && (
        <Row className="g-3 mb-4">
          <Col xs={6} md={4} xl>
            <StatCard
              label="Active Roles"
              value={summary.totalRoles}
              icon={<FiUserCheck size={22} />}
              color="#2563eb"
            />
          </Col>
          <Col xs={6} md={4} xl>
            <StatCard
              label="Permissions"
              value={summary.totalPermissions}
              icon={<FiShield size={22} />}
              color="#16a34a"
            />
          </Col>
          <Col xs={6} md={4} xl>
            <StatCard
              label="Active Policies"
              value={summary.activePolicies}
              icon={<FiLock size={22} />}
              color="#7c3aed"
            />
          </Col>
          <Col xs={6} md={4} xl>
            <StatCard
              label="Events (24h)"
              value={summary.recentSecurityEvents}
              icon={<FiInfo size={22} />}
              color="#d97706"
            />
          </Col>
          <Col xs={6} md={4} xl>
            <StatCard
              label="Critical Events"
              value={summary.criticalEvents}
              icon={<FiAlertCircle size={22} />}
              color={summary.criticalEvents > 0 ? '#dc2626' : '#6b7280'}
            />
          </Col>
        </Row>
      )}

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? 'overview')}>
        <div style={{ overflowX: 'auto' }}>
          <Nav
            variant="tabs"
            className="mb-3"
            style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}
          >
            {tabs.map((t) => (
              <Nav.Item key={t.key}>
                <Nav.Link eventKey={t.key} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                  {t.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>

        <Tab.Content>
          {/* ── Overview ── */}
          <Tab.Pane eventKey="overview">
            <Row className="g-3">
              <Col md={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header
                    style={{ background: '#fff', fontWeight: 600 }}
                    className="d-flex justify-content-between align-items-center"
                  >
                    Roles
                    <Badge bg="primary" style={{ fontSize: 11 }}>
                      {roles.length}
                    </Badge>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {rolesQ.isLoading ? (
                        <div className="text-center py-3">
                          <Spinner size="sm" />
                        </div>
                      ) : (
                        roles.map((role) => (
                          <div
                            key={role._id}
                            className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"
                            style={{ fontSize: 13 }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{role.name}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {role.description}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {role.isSystem && (
                                <Badge bg="secondary" style={{ fontSize: 10 }}>
                                  system
                                </Badge>
                              )}
                              <Badge
                                bg={role.status === 'active' ? 'success' : 'secondary'}
                                style={{ fontSize: 10 }}
                              >
                                {role.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header
                    style={{ background: '#fff', fontWeight: 600 }}
                    className="d-flex justify-content-between align-items-center"
                  >
                    Recent Security Events
                    {summary && summary.criticalEvents > 0 && (
                      <Badge bg="danger" style={{ fontSize: 11 }}>
                        {summary.criticalEvents} critical
                      </Badge>
                    )}
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {eventsQ.isLoading ? (
                        <div className="text-center py-3">
                          <Spinner size="sm" />
                        </div>
                      ) : events.length === 0 ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                          No security events in the last 24h
                        </div>
                      ) : (
                        events.slice(0, 8).map((ev) => (
                          <div
                            key={ev._id}
                            className="d-flex align-items-start gap-2 px-3 py-2 border-bottom"
                            style={{ fontSize: 12 }}
                          >
                            <span
                              style={{
                                color:
                                  ev.severity === 'critical'
                                    ? '#dc2626'
                                    : ev.severity === 'warning'
                                      ? '#d97706'
                                      : '#6b7280',
                                marginTop: 1,
                              }}
                            >
                              {severityIcon(ev.severity)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {ev.eventType}
                              </div>
                              <div style={{ color: '#9ca3af' }}>{fmtDate(ev.createdAt)}</div>
                            </div>
                            <Badge
                              bg={severityColor[ev.severity] ?? 'secondary'}
                              style={{ fontSize: 9, flexShrink: 0 }}
                            >
                              {ev.severity}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          {/* ── Roles ── */}
          <Tab.Pane eventKey="roles">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                {roles.length} roles configured
              </span>
              <Button
                size="sm"
                style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                onClick={() => setShowCreateRole(true)}
              >
                <FiPlus size={14} className="me-1" />
                New Role
              </Button>
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Permissions</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesQ.isLoading && (
                      <tr>
                        <td colSpan={6} className="text-center py-3">
                          <Spinner size="sm" />
                        </td>
                      </tr>
                    )}
                    {roles.map((role) => (
                      <tr key={role._id}>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{role.name}</td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280' }}>
                          {role.slug}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {Array.isArray(role.permissions) ? role.permissions.length : 0}
                        </td>
                        <td>
                          <Badge
                            bg={role.isSystem ? 'dark' : 'light'}
                            text={role.isSystem ? undefined : 'dark'}
                            style={{ fontSize: 10 }}
                          >
                            {role.isSystem ? 'system' : 'custom'}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            bg={role.status === 'active' ? 'success' : 'secondary'}
                            style={{ fontSize: 10 }}
                          >
                            {role.status}
                          </Badge>
                        </td>
                        <td>
                          {!role.isSystem && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              style={{ fontSize: 11, padding: '1px 8px' }}
                              disabled={deleteRoleMutation.isPending}
                              onClick={() => deleteRoleMutation.mutate(role._id)}
                            >
                              <FiTrash2 size={11} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Permissions ── */}
          <Tab.Pane eventKey="permissions">
            <div className="mb-3">
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                {permissions.length} permissions registered
              </span>
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <Table size="sm" hover className="mb-0">
                    <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                      <tr>
                        <th>Name</th>
                        <th>Resource</th>
                        <th>Action</th>
                        <th>Description</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionsQ.isLoading && (
                        <tr>
                          <td colSpan={5} className="text-center py-3">
                            <Spinner size="sm" />
                          </td>
                        </tr>
                      )}
                      {permissions.map((perm) => (
                        <tr key={perm._id}>
                          <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{perm.name}</td>
                          <td>
                            <Badge bg="light" text="dark" style={{ fontSize: 10 }}>
                              {perm.resource}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="info" style={{ fontSize: 10 }}>
                              {perm.action}
                            </Badge>
                          </td>
                          <td style={{ fontSize: 12, color: '#6b7280' }}>{perm.description}</td>
                          <td>
                            <Badge
                              bg={perm.isSystem ? 'dark' : 'secondary'}
                              style={{ fontSize: 10 }}
                            >
                              {perm.isSystem ? 'system' : 'custom'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Permission Matrix ── */}
          <Tab.Pane eventKey="matrix">
            <div className="mb-3">
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                Resource × Action permission matrix
              </span>
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                {permissionsQ.isLoading ? (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <PermissionMatrix permissions={permissions} roles={roles} />
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Assignments ── */}
          <Tab.Pane eventKey="assignments">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                {assignmentsQ.data?.total ?? 0} role assignments
              </span>
              <Button
                size="sm"
                style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                onClick={() => setShowAssign(true)}
              >
                <FiPlus size={14} className="me-1" />
                Assign Role
              </Button>
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Assigned By</th>
                      <th>Assigned At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentsQ.isLoading && (
                      <tr>
                        <td colSpan={5} className="text-center py-3">
                          <Spinner size="sm" />
                        </td>
                      </tr>
                    )}
                    {assignments.map((a) => {
                      const user = a.userId as unknown as {
                        _id: string
                        name: string
                        email: string
                      }
                      const role = a.roleId as unknown as { name: string; slug: string }
                      const by = a.assignedBy as unknown as { name: string }
                      return (
                        <tr key={a._id}>
                          <td style={{ fontSize: 12 }}>
                            <div style={{ fontWeight: 600 }}>{user?.name ?? '—'}</div>
                            <div style={{ color: '#6b7280', fontSize: 11 }}>{user?.email}</div>
                          </td>
                          <td>
                            <Badge bg="primary" style={{ fontSize: 11 }}>
                              {role?.name ?? '—'}
                            </Badge>
                          </td>
                          <td style={{ fontSize: 12 }}>{by?.name ?? '—'}</td>
                          <td style={{ fontSize: 12 }}>{fmtDate(a.createdAt)}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              style={{ fontSize: 11, padding: '1px 8px' }}
                              disabled={revokeMutation.isPending}
                              onClick={() =>
                                revokeMutation.mutate({
                                  userId: String(user?._id ?? a.userId),
                                  roleId: String(
                                    (a.roleId as unknown as { _id: string })?._id ?? a.roleId,
                                  ),
                                })
                              }
                            >
                              Revoke
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {!assignmentsQ.isLoading && assignments.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-4 text-muted"
                          style={{ fontSize: 13 }}
                        >
                          No role assignments yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Policies ── */}
          <Tab.Pane eventKey="policies">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                {policies.length} security policies
              </span>
              <Button
                size="sm"
                style={{ background: '#FF9900', border: 'none', color: '#fff' }}
                onClick={() => setShowCreatePolicy(true)}
              >
                <FiPlus size={14} className="me-1" />
                New Policy
              </Button>
            </div>
            <Row className="g-3">
              {policiesQ.isLoading && (
                <Col>
                  <div className="text-center py-4">
                    <Spinner animation="border" style={{ color: '#FF9900' }} />
                  </div>
                </Col>
              )}
              {policies.map((policy) => (
                <Col key={policy._id} xs={12} md={6} xl={4}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{policy.name}</div>
                        <Badge
                          bg={policy.isActive ? 'success' : 'secondary'}
                          style={{ fontSize: 10 }}
                        >
                          {policy.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        Type: <strong>{policy.type.replace(/_/g, ' ')}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                        Applies to: <strong>{policy.appliesTo}</strong>
                      </div>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        style={{ fontSize: 11 }}
                        disabled={deletePolicyMutation.isPending}
                        onClick={() => deletePolicyMutation.mutate(policy._id)}
                      >
                        <FiTrash2 size={11} className="me-1" />
                        Remove
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
              {!policiesQ.isLoading && policies.length === 0 && (
                <Col>
                  <div className="text-center py-5 text-muted">
                    <FiLock size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <div style={{ fontSize: 14 }}>No security policies configured yet.</div>
                  </div>
                </Col>
              )}
            </Row>
          </Tab.Pane>

          {/* ── Security Events ── */}
          <Tab.Pane eventKey="events">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex gap-2 align-items-center">
                <span style={{ fontSize: 13, color: '#6b7280' }}>Filter:</span>
                {([undefined, 'info', 'warning', 'critical'] as (string | undefined)[]).map((s) => (
                  <Button
                    key={s ?? 'all'}
                    size="sm"
                    variant={eventSeverity === s ? 'warning' : 'outline-secondary'}
                    style={
                      eventSeverity === s
                        ? { background: '#FF9900', border: 'none', color: '#fff', fontSize: 12 }
                        : { fontSize: 12 }
                    }
                    onClick={() => setEventSeverity(s)}
                  >
                    {s ?? 'all'}
                  </Button>
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {eventsQ.data?.total ?? 0} total events
              </span>
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table size="sm" hover className="mb-0">
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Severity</th>
                      <th>Event Type</th>
                      <th>User ID</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsQ.isLoading && (
                      <tr>
                        <td colSpan={5} className="text-center py-3">
                          <Spinner size="sm" />
                        </td>
                      </tr>
                    )}
                    {events.map((ev) => (
                      <tr key={ev._id}>
                        <td>
                          <Badge
                            bg={severityColor[ev.severity] ?? 'secondary'}
                            style={{ fontSize: 10 }}
                          >
                            <span className="me-1">{severityIcon(ev.severity)}</span>
                            {ev.severity}
                          </Badge>
                        </td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{ev.eventType}</td>
                        <td style={{ fontSize: 11, color: '#6b7280' }}>
                          {ev.userId ? String(ev.userId).slice(-8) : '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>{ev.ip ?? '—'}</td>
                        <td style={{ fontSize: 12 }}>{fmtDate(ev.createdAt)}</td>
                      </tr>
                    ))}
                    {!eventsQ.isLoading && events.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-4 text-muted"
                          style={{ fontSize: 13 }}
                        >
                          No security events found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* ── Organizations ── */}
          <Tab.Pane eventKey="organizations">
            <OrganizationsPanel />
          </Tab.Pane>

          {/* ── Teams ── */}
          <Tab.Pane eventKey="teams">
            <TeamsPanel />
          </Tab.Pane>

          {/* ── Sessions ── */}
          <Tab.Pane eventKey="sessions">
            <SessionsPanel />
          </Tab.Pane>

          {/* ── MFA ── */}
          <Tab.Pane eventKey="mfa">
            <div className="mb-3">
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Configure multi-factor authentication for admin accounts. Use the field below to
                manage MFA for any user by ID, or leave blank to manage your own.
              </p>
            </div>
            <MfaPanel />
          </Tab.Pane>

          {/* ── Risk Events ── */}
          <Tab.Pane eventKey="risk">
            <RiskPanel />
          </Tab.Pane>

          {/* ── Compliance ── */}
          <Tab.Pane eventKey="compliance">
            <CompliancePanel />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* ── Create Role Modal ── */}
      <Modal show={showCreateRole} onHide={() => setShowCreateRole(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>
            <FiUserCheck className="me-2" style={{ color: '#FF9900' }} />
            Create Role
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Role Name *</Form.Label>
            <Form.Control
              size="sm"
              value={roleForm.name}
              onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Marketing Manager"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Description</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={2}
              value={roleForm.description}
              onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe what this role can do"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowCreateRole(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={handleCreateRole}
            disabled={createRoleMutation.isPending || !roleForm.name.trim()}
          >
            {createRoleMutation.isPending ? <Spinner size="sm" /> : 'Create Role'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Create Policy Modal ── */}
      <Modal show={showCreatePolicy} onHide={() => setShowCreatePolicy(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>
            <FiLock className="me-2" style={{ color: '#FF9900' }} />
            Create Security Policy
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Name *</Form.Label>
            <Form.Control
              size="sm"
              value={policyForm.name}
              onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Admin IP Restriction"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Type *</Form.Label>
            <Form.Select
              size="sm"
              value={policyForm.type}
              onChange={(e) =>
                setPolicyForm((f) => ({
                  ...f,
                  type: e.target.value as ISecurityPolicy['type'],
                }))
              }
            >
              <option value="ip_allowlist">IP Allowlist</option>
              <option value="mfa_requirement">MFA Requirement</option>
              <option value="session_limit">Session Limit</option>
              <option value="password_policy">Password Policy</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Applies To</Form.Label>
            <Form.Select
              size="sm"
              value={policyForm.appliesTo}
              onChange={(e) =>
                setPolicyForm((f) => ({
                  ...f,
                  appliesTo: e.target.value as ISecurityPolicy['appliesTo'],
                }))
              }
            >
              <option value="all">All Users</option>
              <option value="admin">Admin Only</option>
              <option value="vendor">Vendors Only</option>
              <option value="user">Customers Only</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Rules (JSON)</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={3}
              value={policyForm.rules}
              onChange={(e) => setPolicyForm((f) => ({ ...f, rules: e.target.value }))}
              placeholder='{"allowedIPs": ["192.168.1.0/24"]}'
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowCreatePolicy(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={handleCreatePolicy}
            disabled={createPolicyMutation.isPending || !policyForm.name.trim()}
          >
            {createPolicyMutation.isPending ? <Spinner size="sm" /> : 'Create Policy'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Assign Role Modal ── */}
      <Modal show={showAssign} onHide={() => setShowAssign(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>
            <FiEdit2 className="me-2" style={{ color: '#FF9900' }} />
            Assign Role to User
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>User ID *</Form.Label>
            <Form.Control
              size="sm"
              value={assignForm.userId}
              onChange={(e) => setAssignForm((f) => ({ ...f, userId: e.target.value }))}
              placeholder="Paste the user's MongoDB ID"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Role *</Form.Label>
            <Form.Select
              size="sm"
              value={assignForm.roleId}
              onChange={(e) => setAssignForm((f) => ({ ...f, roleId: e.target.value }))}
            >
              <option value="">Select a role…</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowAssign(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: '#FF9900', border: 'none', color: '#fff' }}
            onClick={handleAssignRole}
            disabled={assignMutation.isPending || !assignForm.userId.trim() || !assignForm.roleId}
          >
            {assignMutation.isPending ? <Spinner size="sm" /> : 'Assign Role'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
