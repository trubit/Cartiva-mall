// ── Enums ─────────────────────────────────────────────────────────────────────

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  EXPORT = 'export',
}

export enum PermissionResource {
  USERS = 'users',
  PRODUCTS = 'products',
  ORDERS = 'orders',
  VENDORS = 'vendors',
  FINANCE = 'finance',
  ANALYTICS = 'analytics',
  FORECASTING = 'forecasting',
  WORKFLOWS = 'workflows',
  INVENTORY = 'inventory',
  PROMOTIONS = 'promotions',
  SHIPPING = 'shipping',
  RETURNS = 'returns',
  SETTINGS = 'settings',
  REPORTS = 'reports',
  IAM = 'iam',
}

export enum RoleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// ── Core IAM Types ─────────────────────────────────────────────────────────────

export interface IPermission {
  _id: string
  name: string
  resource: PermissionResource
  action: PermissionAction
  description?: string
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface IRole {
  _id: string
  name: string
  slug: string
  description?: string
  permissions: string[] | IPermission[]
  isSystem: boolean
  status: RoleStatus
  userCount?: number
  createdAt: string
  updatedAt: string
}

export interface ISecurityPolicy {
  _id: string
  name: string
  type: 'ip_allowlist' | 'mfa_requirement' | 'session_limit' | 'password_policy'
  rules: Record<string, unknown>
  isActive: boolean
  appliesTo: 'all' | 'admin' | 'vendor' | 'user'
  createdAt: string
  updatedAt: string
}

export interface ISecurityEvent {
  _id: string
  eventType: string
  userId?: string
  ip?: string
  userAgent?: string
  details: Record<string, unknown>
  severity: 'info' | 'warning' | 'critical'
  createdAt: string
}

export interface IUserRoleAssignment {
  _id: string
  userId: string
  roleId: string | IRole
  assignedBy: string
  createdAt: string
}

export interface IamSummary {
  totalRoles: number
  totalPermissions: number
  activePolicies: number
  recentSecurityEvents: number
  criticalEvents: number
}

// ── Organizations & Teams ─────────────────────────────────────────────────────

export interface IOrganization {
  _id: string
  name: string
  slug: string
  description?: string
  ownerId: string
  memberIds: string[]
  isActive: boolean
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ITeam {
  _id: string
  name: string
  description?: string
  organizationId: string | IOrganization
  leaderId?: string
  memberIds: string[]
  roleIds: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Sessions & Devices ────────────────────────────────────────────────────────

export interface ISession {
  _id: string
  userId: string
  token: string
  deviceId?: string
  ip?: string
  userAgent?: string
  location?: string
  isActive: boolean
  lastSeenAt: string
  expiresAt: string
  createdAt: string
}

export interface IDevice {
  _id: string
  userId: string
  fingerprint: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os?: string
  browser?: string
  ip?: string
  isTrusted: boolean
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

// ── MFA ───────────────────────────────────────────────────────────────────────

export interface IMfaSetupResult {
  secret: string
  qrCode: string
  recoveryCodes: string[]
}

export interface IMfaStatus {
  isEnabled: boolean
  hasSetup: boolean
  enabledAt?: string
  lastUsedAt?: string
  recoveryCodesRemaining?: number
}

// ── Risk Engine ───────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface IRiskEvent {
  _id: string
  userId?: string
  eventType: string
  riskScore: number
  riskLevel: RiskLevel
  ip?: string
  userAgent?: string
  details: Record<string, unknown>
  resolved: boolean
  resolvedAt?: string
  createdAt: string
}

// ── Compliance ────────────────────────────────────────────────────────────────

export type ComplianceReportType =
  | 'access_review'
  | 'permission_audit'
  | 'session_audit'
  | 'security_events'
  | 'mfa_compliance'
  | 'data_retention'

export interface IComplianceReport {
  _id: string
  type: ComplianceReportType
  title: string
  periodStart: string
  periodEnd: string
  generatedBy: string | { name: string; email: string }
  status: 'pending' | 'generating' | 'completed' | 'failed'
  data: Record<string, unknown>
  summary: string
  jobId?: string
  createdAt: string
  updatedAt: string
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions: string[]
}

export interface CreatePermissionRequest {
  name: string
  resource: PermissionResource
  action: PermissionAction
  description?: string
}

export interface CreateSecurityPolicyRequest {
  name: string
  type: ISecurityPolicy['type']
  rules: Record<string, unknown>
  appliesTo: ISecurityPolicy['appliesTo']
}

export interface AssignRoleRequest {
  userId: string
  roleId: string
}

export interface LogSecurityEventRequest {
  eventType: string
  userId?: string
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
  severity?: ISecurityEvent['severity']
}

export interface CreateOrganizationRequest {
  name: string
  description?: string
}

export interface CreateTeamRequest {
  name: string
  description?: string
  organizationId: string
  leaderId?: string
  memberIds?: string[]
  roleIds?: string[]
}

export interface GenerateComplianceReportRequest {
  type: ComplianceReportType
  title: string
  periodStart: string
  periodEnd: string
}
