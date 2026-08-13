import crypto from 'crypto'
import { Types } from 'mongoose'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { Permission } from './permission.model.js'
import { Role } from './role.model.js'
import { SecurityPolicy } from './securityPolicy.model.js'
import { SecurityEvent } from './securityEvent.model.js'
import { UserRoleAssignment } from './userRoleAssignment.model.js'
import { Organization } from './organization.model.js'
import { Team } from './team.model.js'
import { Session } from './session.model.js'
import { Device } from './device.model.js'
import { Mfa } from './mfa.model.js'
import { RiskEvent } from './riskEvent.model.js'
import { ComplianceReport, type ComplianceReportType } from './complianceReport.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import { cacheGet, cacheSet } from '../../utils/cache.js'
import { enqueueComplianceReport } from '../../queue/iam.queue.js'
import type {
  CreateRoleRequest,
  CreatePermissionRequest,
  CreateSecurityPolicyRequest,
  AssignRoleRequest,
  LogSecurityEventRequest,
} from '../../../../src/shared/types/iam.types.js'

// ── Seed ──────────────────────────────────────────────────────────────────────

const SYSTEM_PERMISSIONS = [
  { name: 'users:read', resource: 'users', action: 'read', description: 'View user accounts' },
  {
    name: 'users:create',
    resource: 'users',
    action: 'create',
    description: 'Create user accounts',
  },
  { name: 'users:update', resource: 'users', action: 'update', description: 'Edit user accounts' },
  {
    name: 'users:delete',
    resource: 'users',
    action: 'delete',
    description: 'Delete user accounts',
  },
  { name: 'products:read', resource: 'products', action: 'read', description: 'View products' },
  {
    name: 'products:create',
    resource: 'products',
    action: 'create',
    description: 'Create products',
  },
  { name: 'products:update', resource: 'products', action: 'update', description: 'Edit products' },
  {
    name: 'products:delete',
    resource: 'products',
    action: 'delete',
    description: 'Delete products',
  },
  {
    name: 'products:approve',
    resource: 'products',
    action: 'approve',
    description: 'Approve pending products',
  },
  { name: 'orders:read', resource: 'orders', action: 'read', description: 'View orders' },
  {
    name: 'orders:update',
    resource: 'orders',
    action: 'update',
    description: 'Update order status',
  },
  { name: 'vendors:read', resource: 'vendors', action: 'read', description: 'View vendors' },
  {
    name: 'vendors:approve',
    resource: 'vendors',
    action: 'approve',
    description: 'Approve vendor applications',
  },
  { name: 'finance:read', resource: 'finance', action: 'read', description: 'View financial data' },
  {
    name: 'finance:create',
    resource: 'finance',
    action: 'create',
    description: 'Create financial records',
  },
  {
    name: 'finance:export',
    resource: 'finance',
    action: 'export',
    description: 'Export financial reports',
  },
  {
    name: 'analytics:read',
    resource: 'analytics',
    action: 'read',
    description: 'View analytics data',
  },
  {
    name: 'analytics:export',
    resource: 'analytics',
    action: 'export',
    description: 'Export analytics reports',
  },
  {
    name: 'forecasting:read',
    resource: 'forecasting',
    action: 'read',
    description: 'View forecasts',
  },
  { name: 'workflows:read', resource: 'workflows', action: 'read', description: 'View workflows' },
  {
    name: 'workflows:create',
    resource: 'workflows',
    action: 'create',
    description: 'Create workflows',
  },
  {
    name: 'workflows:execute',
    resource: 'workflows',
    action: 'execute',
    description: 'Execute workflows',
  },
  { name: 'inventory:read', resource: 'inventory', action: 'read', description: 'View inventory' },
  {
    name: 'inventory:update',
    resource: 'inventory',
    action: 'update',
    description: 'Update inventory',
  },
  {
    name: 'promotions:read',
    resource: 'promotions',
    action: 'read',
    description: 'View promotions',
  },
  {
    name: 'promotions:create',
    resource: 'promotions',
    action: 'create',
    description: 'Create promotions',
  },
  { name: 'shipping:read', resource: 'shipping', action: 'read', description: 'View shipments' },
  {
    name: 'shipping:update',
    resource: 'shipping',
    action: 'update',
    description: 'Update shipments',
  },
  { name: 'returns:read', resource: 'returns', action: 'read', description: 'View returns' },
  { name: 'returns:update', resource: 'returns', action: 'update', description: 'Process returns' },
  { name: 'reports:read', resource: 'reports', action: 'read', description: 'View reports' },
  { name: 'reports:export', resource: 'reports', action: 'export', description: 'Export reports' },
  { name: 'settings:read', resource: 'settings', action: 'read', description: 'View settings' },
  {
    name: 'settings:update',
    resource: 'settings',
    action: 'update',
    description: 'Modify settings',
  },
  { name: 'iam:read', resource: 'iam', action: 'read', description: 'View IAM configuration' },
  {
    name: 'iam:create',
    resource: 'iam',
    action: 'create',
    description: 'Create roles and permissions',
  },
  {
    name: 'iam:update',
    resource: 'iam',
    action: 'update',
    description: 'Modify roles and permissions',
  },
  {
    name: 'iam:delete',
    resource: 'iam',
    action: 'delete',
    description: 'Delete roles and permissions',
  },
] as const

const SYSTEM_ROLES = [
  {
    name: 'Super Administrator',
    slug: 'super-admin',
    description: 'Full access to all platform resources',
    permissionNames: SYSTEM_PERMISSIONS.map((p) => p.name),
  },
  {
    name: 'Finance Manager',
    slug: 'finance-manager',
    description: 'Access to finance, reports, and analytics',
    permissionNames: [
      'finance:read',
      'finance:create',
      'finance:export',
      'analytics:read',
      'analytics:export',
      'reports:read',
      'reports:export',
    ],
  },
  {
    name: 'Operations Manager',
    slug: 'operations-manager',
    description: 'Manage orders, shipping, returns, and inventory',
    permissionNames: [
      'orders:read',
      'orders:update',
      'shipping:read',
      'shipping:update',
      'returns:read',
      'returns:update',
      'inventory:read',
      'inventory:update',
    ],
  },
  {
    name: 'Vendor Manager',
    slug: 'vendor-manager',
    description: 'Approve and manage vendor accounts',
    permissionNames: ['vendors:read', 'vendors:approve', 'products:read', 'products:approve'],
  },
  {
    name: 'Content Manager',
    slug: 'content-manager',
    description: 'Manage products and promotions',
    permissionNames: [
      'products:read',
      'products:create',
      'products:update',
      'promotions:read',
      'promotions:create',
    ],
  },
  {
    name: 'Read-Only Analyst',
    slug: 'read-only-analyst',
    description: 'View-only access to analytics and reports',
    permissionNames: ['analytics:read', 'reports:read', 'forecasting:read'],
  },
] as const

export const seedDefaultPermissions = async (): Promise<void> => {
  for (const perm of SYSTEM_PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { name: perm.name },
      { $setOnInsert: { ...perm, isSystem: true } },
      { upsert: true },
    )
  }
  for (const roleDef of SYSTEM_ROLES) {
    const permDocs = await Permission.find({
      name: { $in: roleDef.permissionNames as unknown as string[] },
    })
      .select('_id')
      .lean()
    const permIds = permDocs.map((p) => p._id)
    await Role.findOneAndUpdate(
      { slug: roleDef.slug },
      {
        $setOnInsert: {
          name: roleDef.name,
          slug: roleDef.slug,
          description: roleDef.description,
          permissions: permIds,
          isSystem: true,
          status: 'active',
        },
      },
      { upsert: true },
    )
  }
  logger.info('IAM: default permissions and roles seeded')
}

// ── Summary ───────────────────────────────────────────────────────────────────

export const getIamSummary = async () => {
  const cached = await cacheGet<Record<string, number>>('iam:summary')
  if (cached) return cached

  const [totalRoles, totalPermissions, activePolicies, recentSecurityEvents, criticalEvents] =
    await Promise.all([
      Role.countDocuments({ status: 'active' }),
      Permission.countDocuments(),
      SecurityPolicy.countDocuments({ isActive: true }),
      SecurityEvent.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      SecurityEvent.countDocuments({
        severity: 'critical',
        createdAt: { $gte: new Date(Date.now() - 86400000) },
      }),
    ])

  const summary = {
    totalRoles,
    totalPermissions,
    activePolicies,
    recentSecurityEvents,
    criticalEvents,
  }
  await cacheSet('iam:summary', summary, 120)
  return summary
}

// ── Permissions ───────────────────────────────────────────────────────────────

export const listPermissions = async () => Permission.find().sort({ resource: 1, action: 1 }).lean()

export const createPermission = async (data: CreatePermissionRequest) => {
  const existing = await Permission.findOne({ name: data.name })
  if (existing) throw new AppError('Permission with this name already exists', 409)
  return Permission.create({ ...data, isSystem: false })
}

export const deletePermission = async (id: string) => {
  const perm = await Permission.findById(id)
  if (!perm) throw new AppError('Permission not found', 404)
  if (perm.isSystem) throw new AppError('System permissions cannot be deleted', 403)
  await Role.updateMany(
    { permissions: new Types.ObjectId(id) },
    { $pull: { permissions: new Types.ObjectId(id) } },
  )
  await perm.deleteOne()
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export const listRoles = async () =>
  Role.find().populate('permissions', 'name resource action').sort({ isSystem: -1, name: 1 }).lean()

export const getRole = async (id: string) => {
  const role = await Role.findById(id).populate('permissions').lean()
  if (!role) throw new AppError('Role not found', 404)
  const userCount = await UserRoleAssignment.countDocuments({ roleId: id })
  return { ...role, userCount }
}

export const createRole = async (data: CreateRoleRequest) => {
  const existing = await Role.findOne({ name: data.name })
  if (existing) throw new AppError('Role with this name already exists', 409)
  const slug = data.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const permIds = (data.permissions ?? []).map((id) => new Types.ObjectId(id))
  return Role.create({
    name: data.name,
    slug,
    description: data.description,
    permissions: permIds,
    isSystem: false,
    status: 'active',
  })
}

export const updateRole = async (id: string, data: Partial<CreateRoleRequest>) => {
  const role = await Role.findById(id)
  if (!role) throw new AppError('Role not found', 404)
  if (role.isSystem) throw new AppError('System roles cannot be modified', 403)
  if (data.name) role.name = data.name
  if (data.description !== undefined) role.description = data.description
  if (data.permissions) role.permissions = data.permissions.map((p) => new Types.ObjectId(p))
  await role.save()
  return role.populate('permissions')
}

export const deleteRole = async (id: string) => {
  const role = await Role.findById(id)
  if (!role) throw new AppError('Role not found', 404)
  if (role.isSystem) throw new AppError('System roles cannot be deleted', 403)
  const usersWithRole = await UserRoleAssignment.countDocuments({ roleId: id })
  if (usersWithRole > 0)
    throw new AppError(`Cannot delete role — ${usersWithRole} user(s) still assigned`, 409)
  await role.deleteOne()
}

// ── Assignments ───────────────────────────────────────────────────────────────

export const assignRoleToUser = async (data: AssignRoleRequest, assignedBy: string) => {
  const role = await Role.findById(data.roleId)
  if (!role) throw new AppError('Role not found', 404)
  const existing = await UserRoleAssignment.findOne({ userId: data.userId, roleId: data.roleId })
  if (existing) throw new AppError('User already has this role', 409)
  return UserRoleAssignment.create({
    userId: new Types.ObjectId(data.userId),
    roleId: new Types.ObjectId(data.roleId),
    assignedBy: new Types.ObjectId(assignedBy),
  })
}

export const revokeRoleFromUser = async (userId: string, roleId: string) => {
  const assignment = await UserRoleAssignment.findOne({ userId, roleId })
  if (!assignment) throw new AppError('Role assignment not found', 404)
  await assignment.deleteOne()
}

export const getUserRoles = async (userId: string) =>
  UserRoleAssignment.find({ userId }).populate('roleId', 'name slug description status').lean()

export const listUserAssignments = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    UserRoleAssignment.find()
      .populate('userId', 'name email role')
      .populate('roleId', 'name slug')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserRoleAssignment.countDocuments(),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}

// ── Security Policies ─────────────────────────────────────────────────────────

export const listSecurityPolicies = async () => SecurityPolicy.find().sort({ type: 1 }).lean()

export const createSecurityPolicy = async (data: CreateSecurityPolicyRequest) => {
  const existing = await SecurityPolicy.findOne({ name: data.name })
  if (existing) throw new AppError('Security policy with this name already exists', 409)
  return SecurityPolicy.create(data)
}

export const updateSecurityPolicy = async (
  id: string,
  data: Partial<CreateSecurityPolicyRequest> & { isActive?: boolean },
) => {
  const policy = await SecurityPolicy.findById(id)
  if (!policy) throw new AppError('Security policy not found', 404)
  Object.assign(policy, data)
  return policy.save()
}

export const deleteSecurityPolicy = async (id: string) => {
  const policy = await SecurityPolicy.findByIdAndDelete(id)
  if (!policy) throw new AppError('Security policy not found', 404)
}

// ── Security Events ───────────────────────────────────────────────────────────

export const logSecurityEvent = (data: LogSecurityEventRequest): void => {
  SecurityEvent.create({
    eventType: data.eventType,
    userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
    ip: data.ip,
    userAgent: data.userAgent,
    details: data.details ?? {},
    severity: data.severity ?? 'info',
  }).catch(() => {})
}

export const getSecurityEvents = async (page = 1, limit = 50, severity?: string) => {
  const filter: Record<string, unknown> = {}
  if (severity) filter.severity = severity
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    SecurityEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SecurityEvent.countDocuments(filter),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}

// ── Organizations ─────────────────────────────────────────────────────────────

export const listOrganizations = async () =>
  Organization.find({ isActive: true }).sort({ name: 1 }).lean()

export const createOrganization = async (
  data: { name: string; description?: string },
  ownerId: string,
) => {
  const slug = data.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const existing = await Organization.findOne({ slug })
  if (existing) throw new AppError('Organization with this name already exists', 409)
  return Organization.create({
    name: data.name,
    slug,
    description: data.description,
    ownerId: new Types.ObjectId(ownerId),
    memberIds: [new Types.ObjectId(ownerId)],
  })
}

export const addOrgMember = async (orgId: string, userId: string) => {
  const org = await Organization.findById(orgId)
  if (!org) throw new AppError('Organization not found', 404)
  if (org.memberIds.some((m) => m.toString() === userId))
    throw new AppError('User is already a member', 409)
  return Organization.findByIdAndUpdate(
    orgId,
    { $push: { memberIds: new Types.ObjectId(userId) } },
    { returnDocument: 'after' },
  )
}

export const removeOrgMember = async (orgId: string, userId: string) => {
  const org = await Organization.findById(orgId)
  if (!org) throw new AppError('Organization not found', 404)
  if (org.ownerId.toString() === userId)
    throw new AppError('Cannot remove the organization owner', 409)
  return Organization.findByIdAndUpdate(
    orgId,
    { $pull: { memberIds: new Types.ObjectId(userId) } },
    { returnDocument: 'after' },
  )
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export const listTeams = async (orgId?: string) => {
  const filter: Record<string, unknown> = { isActive: true }
  if (orgId) filter.organizationId = new Types.ObjectId(orgId)
  return Team.find(filter)
    .populate('organizationId', 'name')
    .populate('leaderId', 'name email')
    .sort({ name: 1 })
    .lean()
}

export const createTeam = async (data: {
  name: string
  description?: string
  organizationId: string
  leaderId?: string
  memberIds?: string[]
  roleIds?: string[]
}) => {
  const org = await Organization.findById(data.organizationId)
  if (!org) throw new AppError('Organization not found', 404)
  return Team.create({
    name: data.name,
    description: data.description,
    organizationId: new Types.ObjectId(data.organizationId),
    leaderId: data.leaderId ? new Types.ObjectId(data.leaderId) : undefined,
    memberIds: (data.memberIds ?? []).map((id) => new Types.ObjectId(id)),
    roleIds: (data.roleIds ?? []).map((id) => new Types.ObjectId(id)),
  })
}

export const deleteTeam = async (id: string) => {
  const team = await Team.findByIdAndDelete(id)
  if (!team) throw new AppError('Team not found', 404)
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export const trackSession = async (data: {
  userId: string
  token: string
  ip?: string
  userAgent?: string
  expiresAt: Date
}) => {
  return Session.create({
    userId: new Types.ObjectId(data.userId),
    token: data.token,
    ip: data.ip,
    userAgent: data.userAgent,
    expiresAt: data.expiresAt,
    lastSeenAt: new Date(),
  })
}

export const listUserSessions = async (userId: string) =>
  Session.find({ userId: new Types.ObjectId(userId), isActive: true })
    .sort({ lastSeenAt: -1 })
    .lean()

export const listAllSessions = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Session.find({ isActive: true }).sort({ lastSeenAt: -1 }).skip(skip).limit(limit).lean(),
    Session.countDocuments({ isActive: true }),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}

export const revokeSession = async (id: string) => {
  const session = await Session.findByIdAndUpdate(
    id,
    { isActive: false },
    { returnDocument: 'after' },
  )
  if (!session) throw new AppError('Session not found', 404)
  return session
}

export const revokeAllUserSessions = async (userId: string) => {
  await Session.updateMany(
    { userId: new Types.ObjectId(userId), isActive: true },
    { isActive: false },
  )
}

// ── Devices ───────────────────────────────────────────────────────────────────

export const listUserDevices = async (userId: string) =>
  Device.find({ userId: new Types.ObjectId(userId) })
    .sort({ lastSeenAt: -1 })
    .lean()

export const registerDevice = async (data: {
  userId: string
  fingerprint: string
  name: string
  type?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os?: string
  browser?: string
  ip?: string
}) => {
  const existing = await Device.findOne({ userId: data.userId, fingerprint: data.fingerprint })
  if (existing) {
    existing.lastSeenAt = new Date()
    if (data.ip) existing.ip = data.ip
    return existing.save()
  }
  return Device.create({
    userId: new Types.ObjectId(data.userId),
    fingerprint: data.fingerprint,
    name: data.name,
    type: data.type ?? 'unknown',
    os: data.os,
    browser: data.browser,
    ip: data.ip,
  })
}

export const trustDevice = async (id: string) => {
  const device = await Device.findByIdAndUpdate(
    id,
    { isTrusted: true },
    { returnDocument: 'after' },
  )
  if (!device) throw new AppError('Device not found', 404)
  return device
}

export const revokeDevice = async (id: string) => {
  const device = await Device.findByIdAndDelete(id)
  if (!device) throw new AppError('Device not found', 404)
}

// ── MFA (TOTP) ────────────────────────────────────────────────────────────────

export const setupMfa = async (userId: string, userEmail: string) => {
  const secretObj = speakeasy.generateSecret({
    name: `TrusonShopp:${userEmail}`,
    length: 20,
  })

  const recoveryCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  )

  await Mfa.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { secret: secretObj.base32, isEnabled: false, recoveryCodes, usedRecoveryCodes: [] },
    { upsert: true, returnDocument: 'after' },
  )

  const qrCodeDataUrl = await QRCode.toDataURL(secretObj.otpauth_url ?? '')

  return {
    secret: secretObj.base32,
    qrCode: qrCodeDataUrl,
    recoveryCodes,
  }
}

export const verifyAndEnableMfa = async (userId: string, token: string) => {
  const mfa = await Mfa.findOne({ userId: new Types.ObjectId(userId) })
  if (!mfa) throw new AppError('MFA not set up', 404)
  if (mfa.isEnabled) throw new AppError('MFA is already enabled', 409)

  const isValid = speakeasy.totp.verify({
    secret: mfa.secret,
    encoding: 'base32',
    token,
    window: 1,
  })

  if (!isValid) throw new AppError('Invalid verification code', 401)

  mfa.isEnabled = true
  mfa.enabledAt = new Date()
  mfa.lastUsedAt = new Date()
  await mfa.save()

  return { enabled: true }
}

export const verifyMfaToken = async (userId: string, token: string): Promise<boolean> => {
  const mfa = await Mfa.findOne({ userId: new Types.ObjectId(userId) })
  if (!mfa || !mfa.isEnabled) return false

  const isValid = speakeasy.totp.verify({
    secret: mfa.secret,
    encoding: 'base32',
    token,
    window: 1,
  })

  if (isValid) {
    mfa.lastUsedAt = new Date()
    await mfa.save()
  }

  return isValid
}

export const verifyRecoveryCode = async (userId: string, code: string): Promise<boolean> => {
  const mfa = await Mfa.findOne({ userId: new Types.ObjectId(userId) })
  if (!mfa || !mfa.isEnabled) return false

  const upperCode = code.toUpperCase()
  if (!mfa.recoveryCodes.includes(upperCode)) return false
  if (mfa.usedRecoveryCodes.includes(upperCode)) return false

  mfa.usedRecoveryCodes.push(upperCode)
  mfa.recoveryCodes = mfa.recoveryCodes.filter((c) => c !== upperCode)
  await mfa.save()
  return true
}

export const disableMfa = async (userId: string) => {
  const mfa = await Mfa.findOne({ userId: new Types.ObjectId(userId) })
  if (!mfa) throw new AppError('MFA not configured', 404)
  mfa.isEnabled = false
  mfa.enabledAt = undefined
  mfa.recoveryCodes = []
  mfa.usedRecoveryCodes = []
  await mfa.save()
}

export const getMfaStatus = async (userId: string) => {
  const mfa = await Mfa.findOne({ userId: new Types.ObjectId(userId) }).lean()
  if (!mfa) return { isEnabled: false, hasSetup: false }
  return {
    isEnabled: mfa.isEnabled,
    hasSetup: true,
    enabledAt: mfa.enabledAt,
    lastUsedAt: mfa.lastUsedAt,
    recoveryCodesRemaining: mfa.recoveryCodes.length,
  }
}

// ── Risk Engine ───────────────────────────────────────────────────────────────

export const assessLoginRisk = (data: {
  userId?: string
  ip?: string
  userAgent?: string
  isNewDevice?: boolean
  failedAttempts?: number
}): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } => {
  let score = 0

  if (data.isNewDevice) score += 25
  if (data.failedAttempts && data.failedAttempts > 2) score += data.failedAttempts * 10
  if (!data.ip) score += 10

  const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

  return { score: Math.min(score, 100), level }
}

export const logRiskEvent = (data: {
  userId?: string
  eventType: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
}): void => {
  RiskEvent.create({
    userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
    eventType: data.eventType,
    riskScore: data.riskScore,
    riskLevel: data.riskLevel,
    ip: data.ip,
    userAgent: data.userAgent,
    details: data.details ?? {},
  }).catch(() => {})
}

export const getRiskEvents = async (page = 1, limit = 50, riskLevel?: string) => {
  const filter: Record<string, unknown> = {}
  if (riskLevel) filter.riskLevel = riskLevel
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    RiskEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RiskEvent.countDocuments(filter),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}

export const resolveRiskEvent = async (id: string) => {
  const event = await RiskEvent.findByIdAndUpdate(
    id,
    { resolved: true, resolvedAt: new Date() },
    { returnDocument: 'after' },
  )
  if (!event) throw new AppError('Risk event not found', 404)
  return event
}

// ── Compliance Reports ────────────────────────────────────────────────────────

export const listComplianceReports = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    ComplianceReport.find()
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ComplianceReport.countDocuments(),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}

export const generateComplianceReport = async (data: {
  type: string
  title: string
  periodStart: Date
  periodEnd: Date
  generatedBy: string
}) => {
  const report = await ComplianceReport.create({
    type: data.type as ComplianceReportType,
    title: data.title,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    generatedBy: new Types.ObjectId(data.generatedBy),
    status: 'pending',
  })

  try {
    const jobId = await enqueueComplianceReport(
      report._id.toString(),
      data.type,
      data.periodStart,
      data.periodEnd,
    )
    await ComplianceReport.findByIdAndUpdate(report._id, { jobId })
    logger.info(`Compliance report ${report._id} queued (job ${jobId})`)
  } catch (err) {
    logger.error('Failed to enqueue compliance report', { err })
    await ComplianceReport.findByIdAndUpdate(report._id, { status: 'failed' })
  }

  return report
}

export const getComplianceReport = async (id: string) => {
  const report = await ComplianceReport.findById(id).populate('generatedBy', 'name email').lean()
  if (!report) throw new AppError('Report not found', 404)
  return report
}
