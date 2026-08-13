import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { adminLimiter, dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as ctrl from '../modules/iam/iam.controller.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))
router.use(adminLimiter)

// ── Summary ──────────────────────────────────────────────────────────────────
router.get('/summary', ctrl.getSummary)

// ── Permissions ──────────────────────────────────────────────────────────────
router.get('/permissions', ctrl.listPermissions)
router.post('/permissions', ctrl.createPermission)
router.delete('/permissions/:id', ctrl.deletePermission)

// ── Roles ────────────────────────────────────────────────────────────────────
router.get('/roles', ctrl.listRoles)
router.post('/roles', ctrl.createRole)
router.get('/roles/:id', ctrl.getRole)
router.put('/roles/:id', ctrl.updateRole)
router.delete('/roles/:id', ctrl.deleteRole)

// ── Assignments ──────────────────────────────────────────────────────────────
router.post('/assignments', ctrl.assignRole)
router.get('/assignments', ctrl.listAssignments)
router.get('/assignments/user/:userId', ctrl.getUserRoles)
router.delete('/assignments/user/:userId/role/:roleId', ctrl.revokeRole)

// ── Security Policies ────────────────────────────────────────────────────────
router.get('/policies', ctrl.listSecurityPolicies)
router.post('/policies', ctrl.createSecurityPolicy)
router.put('/policies/:id', ctrl.updateSecurityPolicy)
router.delete('/policies/:id', ctrl.deleteSecurityPolicy)

// ── Security Events ──────────────────────────────────────────────────────────
router.get('/events', ctrl.getSecurityEvents)

// ── Organizations ────────────────────────────────────────────────────────────
router.get('/organizations', ctrl.listOrganizations)
router.post('/organizations', ctrl.createOrganization)
router.post('/organizations/:id/members', ctrl.addOrgMember)
router.delete('/organizations/:id/members/:userId', ctrl.removeOrgMember)

// ── Teams ────────────────────────────────────────────────────────────────────
router.get('/teams', ctrl.listTeams)
router.post('/teams', ctrl.createTeam)
router.delete('/teams/:id', ctrl.deleteTeam)

// ── Sessions ─────────────────────────────────────────────────────────────────
router.get('/sessions', ctrl.listAllSessions)
router.get('/sessions/user/:userId', ctrl.listUserSessions)
router.delete('/sessions/:id', ctrl.revokeSession)
router.delete('/sessions/user/:userId/all', ctrl.revokeAllUserSessions)

// ── Devices ──────────────────────────────────────────────────────────────────
router.get('/devices/user/:userId', ctrl.listUserDevices)
router.post('/devices/:id/trust', ctrl.trustDevice)
router.delete('/devices/:id', ctrl.revokeDevice)

// ── MFA ──────────────────────────────────────────────────────────────────────
router.post('/mfa/setup', ctrl.setupMfa)
router.post('/mfa/verify', ctrl.verifyMfa)
router.delete('/mfa/disable', ctrl.disableMfa)
router.get('/mfa/status', ctrl.getMfaStatus)
router.post('/mfa/:userId/setup', ctrl.setupMfa)
router.post('/mfa/:userId/verify', ctrl.verifyMfa)
router.delete('/mfa/:userId/disable', ctrl.disableMfa)
router.get('/mfa/:userId/status', dashboardLimiter, ctrl.getMfaStatus)

// ── Risk Engine ──────────────────────────────────────────────────────────────
router.get('/risk-events', ctrl.getRiskEvents)
router.post('/risk-events/:id/resolve', ctrl.resolveRiskEvent)

// ── Compliance Reports ────────────────────────────────────────────────────────
router.get('/compliance', ctrl.listComplianceReports)
router.post('/compliance', ctrl.generateComplianceReport)
router.get('/compliance/:id', ctrl.getComplianceReport)

export default router
