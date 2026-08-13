import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { errorHandler } from '../../middlewares/error.middleware.js'

vi.mock('../../middlewares/auth.middleware.js', () => ({
  authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(_req as express.Request & { user: { userId: string; email: string; role: string } }).user = {
      userId: 'admin-id',
      email: 'admin@test.com',
      role: 'admin',
    }
    next()
  },
  authorize:
    (..._roles: string[]) =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}))

vi.mock('../../middlewares/rateLimiter.middleware.js', () => ({
  adminLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  dashboardLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

vi.mock('../../modules/iam/iam.controller.js', () => ({
  getSummary: (_req: express.Request, res: express.Response) =>
    res.json({
      success: true,
      data: {
        totalRoles: 6,
        totalPermissions: 38,
        activePolicies: 0,
        recentSecurityEvents: 0,
        criticalEvents: 0,
      },
    }),
  listPermissions: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createPermission: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: { _id: 'perm1' } }),
  deletePermission: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Permission deleted' }),
  listRoles: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  getRole: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { _id: 'role1', name: 'Finance Manager' } }),
  createRole: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: { _id: 'role1' } }),
  updateRole: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  deleteRole: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Role deleted' }),
  assignRole: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: { _id: 'assign1' } }),
  revokeRole: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Role revoked' }),
  getUserRoles: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  listAssignments: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [], total: 0 }),
  listSecurityPolicies: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createSecurityPolicy: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: { _id: 'pol1' } }),
  updateSecurityPolicy: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  deleteSecurityPolicy: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Security policy deleted' }),
  getSecurityEvents: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [], total: 0 }),
  listOrganizations: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createOrganization: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  addOrgMember: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  removeOrgMember: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Member removed' }),
  listTeams: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createTeam: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  deleteTeam: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Team deleted' }),
  listAllSessions: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  listUserSessions: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  revokeSession: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Session revoked' }),
  revokeAllUserSessions: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'All sessions revoked' }),
  listUserDevices: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  trustDevice: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  revokeDevice: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'Device revoked' }),
  setupMfa: (_req: express.Request, res: express.Response) => res.json({ success: true, data: {} }),
  verifyMfa: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  disableMfa: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'MFA disabled' }),
  getMfaStatus: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { enabled: false } }),
  getRiskEvents: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  resolveRiskEvent: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  listComplianceReports: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  generateComplianceReport: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  getComplianceReport: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
}))

import iamRoutes from '../../routes/iam.routes.js'

const app = express()
app.use(express.json())
app.use('/api/v1/iam', iamRoutes)
app.use(errorHandler)

describe('IAM Routes', () => {
  it('GET /iam/summary returns IAM summary', async () => {
    const res = await request(app).get('/api/v1/iam/summary')
    expect(res.status).toBe(200)
    expect(res.body.data.totalRoles).toBe(6)
  })

  it('GET /iam/roles returns role list', async () => {
    const res = await request(app).get('/api/v1/iam/roles')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('POST /iam/roles creates a role', async () => {
    const res = await request(app)
      .post('/api/v1/iam/roles')
      .send({ name: 'Test Role', permissions: [] })
    expect(res.status).toBe(201)
    expect(res.body.data._id).toBe('role1')
  })

  it('GET /iam/permissions returns permission list', async () => {
    const res = await request(app).get('/api/v1/iam/permissions')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('POST /iam/assignments assigns role to user', async () => {
    const res = await request(app)
      .post('/api/v1/iam/assignments')
      .send({ userId: 'user1', roleId: 'role1' })
    expect(res.status).toBe(201)
    expect(res.body.data._id).toBe('assign1')
  })

  it('GET /iam/policies returns security policies', async () => {
    const res = await request(app).get('/api/v1/iam/policies')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('POST /iam/policies creates a security policy', async () => {
    const res = await request(app)
      .post('/api/v1/iam/policies')
      .send({ name: 'IP Allowlist', type: 'ip_allowlist', rules: {}, appliesTo: 'admin' })
    expect(res.status).toBe(201)
  })

  it('GET /iam/events returns security events', async () => {
    const res = await request(app).get('/api/v1/iam/events')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })
})
