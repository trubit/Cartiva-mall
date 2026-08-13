import type { Request, Response, NextFunction } from 'express'
import * as svc from './iam.service.js'

// ── Summary ───────────────────────────────────────────────────────────────────

export const getSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.getIamSummary() })
  } catch (err) {
    next(err)
  }
}

// ── Permissions ───────────────────────────────────────────────────────────────

export const listPermissions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.listPermissions() })
  } catch (err) {
    next(err)
  }
}

export const createPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await svc.createPermission(req.body) })
  } catch (err) {
    next(err)
  }
}

export const deletePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deletePermission(req.params['id'] as string)
    res.json({ success: true, message: 'Permission deleted' })
  } catch (err) {
    next(err)
  }
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export const listRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.listRoles() })
  } catch (err) {
    next(err)
  }
}

export const getRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.getRole(req.params['id'] as string) })
  } catch (err) {
    next(err)
  }
}

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await svc.createRole(req.body) })
  } catch (err) {
    next(err)
  }
}

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.updateRole(req.params['id'] as string, req.body) })
  } catch (err) {
    next(err)
  }
}

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteRole(req.params['id'] as string)
    res.json({ success: true, message: 'Role deleted' })
  } catch (err) {
    next(err)
  }
}

// ── Assignments ───────────────────────────────────────────────────────────────

export const assignRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignedBy = req.user?.userId ?? ''
    res.status(201).json({ success: true, data: await svc.assignRoleToUser(req.body, assignedBy) })
  } catch (err) {
    next(err)
  }
}

export const revokeRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.revokeRoleFromUser(req.params['userId'] as string, req.params['roleId'] as string)
    res.json({ success: true, message: 'Role revoked' })
  } catch (err) {
    next(err)
  }
}

export const getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.getUserRoles(req.params['userId'] as string) })
  } catch (err) {
    next(err)
  }
}

export const listAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'))
    const limit = parseInt(String(req.query.limit ?? '20'))
    res.json({ success: true, ...(await svc.listUserAssignments(page, limit)) })
  } catch (err) {
    next(err)
  }
}

// ── Security Policies ─────────────────────────────────────────────────────────

export const listSecurityPolicies = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.listSecurityPolicies() })
  } catch (err) {
    next(err)
  }
}

export const createSecurityPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await svc.createSecurityPolicy(req.body) })
  } catch (err) {
    next(err)
  }
}

export const updateSecurityPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.updateSecurityPolicy(req.params['id'] as string, req.body),
    })
  } catch (err) {
    next(err)
  }
}

export const deleteSecurityPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteSecurityPolicy(req.params['id'] as string)
    res.json({ success: true, message: 'Security policy deleted' })
  } catch (err) {
    next(err)
  }
}

// ── Security Events ───────────────────────────────────────────────────────────

export const getSecurityEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'))
    const limit = parseInt(String(req.query.limit ?? '50'))
    res.json({
      success: true,
      ...(await svc.getSecurityEvents(page, limit, req.query.severity as string | undefined)),
    })
  } catch (err) {
    next(err)
  }
}

// ── Organizations ─────────────────────────────────────────────────────────────

export const listOrganizations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.listOrganizations() })
  } catch (err) {
    next(err)
  }
}

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({
      success: true,
      data: await svc.createOrganization(req.body, req.user!.userId),
    })
  } catch (err) {
    next(err)
  }
}

export const addOrgMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.addOrgMember(req.params['id'] as string, req.body.userId),
    })
  } catch (err) {
    next(err)
  }
}

export const removeOrgMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.removeOrgMember(req.params['id'] as string, req.params['userId'] as string),
    })
  } catch (err) {
    next(err)
  }
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export const listTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.listTeams(req.query.orgId as string | undefined),
    })
  } catch (err) {
    next(err)
  }
}

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await svc.createTeam(req.body) })
  } catch (err) {
    next(err)
  }
}

export const deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteTeam(req.params['id'] as string)
    res.json({ success: true, message: 'Team deleted' })
  } catch (err) {
    next(err)
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export const listAllSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'))
    const limit = parseInt(String(req.query.limit ?? '20'))
    res.json({ success: true, ...(await svc.listAllSessions(page, limit)) })
  } catch (err) {
    next(err)
  }
}

export const listUserSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.listUserSessions(req.params['userId'] as string),
    })
  } catch (err) {
    next(err)
  }
}

export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.revokeSession(req.params['id'] as string)
    res.json({ success: true, message: 'Session revoked' })
  } catch (err) {
    next(err)
  }
}

export const revokeAllUserSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.revokeAllUserSessions(req.params['userId'] as string)
    res.json({ success: true, message: 'All sessions revoked' })
  } catch (err) {
    next(err)
  }
}

// ── Devices ───────────────────────────────────────────────────────────────────

export const listUserDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.listUserDevices(req.params['userId'] as string),
    })
  } catch (err) {
    next(err)
  }
}

export const trustDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.trustDevice(req.params['id'] as string) })
  } catch (err) {
    next(err)
  }
}

export const revokeDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.revokeDevice(req.params['id'] as string)
    res.json({ success: true, message: 'Device removed' })
  } catch (err) {
    next(err)
  }
}

// ── MFA ───────────────────────────────────────────────────────────────────────

export const setupMfa = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.params['userId'] as string) ?? req.user!.userId
    const userEmail = req.body.email ?? ''
    res.json({ success: true, data: await svc.setupMfa(userId, userEmail) })
  } catch (err) {
    next(err)
  }
}

export const verifyMfa = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.params['userId'] as string) ?? req.user!.userId
    res.json({ success: true, data: await svc.verifyAndEnableMfa(userId, req.body.token) })
  } catch (err) {
    next(err)
  }
}

export const disableMfa = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.params['userId'] as string) ?? req.user!.userId
    await svc.disableMfa(userId)
    res.json({ success: true, message: 'MFA disabled' })
  } catch (err) {
    next(err)
  }
}

export const getMfaStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.params['userId'] as string) ?? req.user!.userId
    res.json({ success: true, data: await svc.getMfaStatus(userId) })
  } catch (err) {
    next(err)
  }
}

// ── Risk Engine ───────────────────────────────────────────────────────────────

export const getRiskEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'))
    const limit = parseInt(String(req.query.limit ?? '50'))
    res.json({
      success: true,
      ...(await svc.getRiskEvents(page, limit, req.query.riskLevel as string | undefined)),
    })
  } catch (err) {
    next(err)
  }
}

export const resolveRiskEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.resolveRiskEvent(req.params['id'] as string),
    })
  } catch (err) {
    next(err)
  }
}

// ── Compliance ────────────────────────────────────────────────────────────────

export const listComplianceReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'))
    const limit = parseInt(String(req.query.limit ?? '20'))
    res.json({ success: true, ...(await svc.listComplianceReports(page, limit)) })
  } catch (err) {
    next(err)
  }
}

export const generateComplianceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.generateComplianceReport({
      ...req.body,
      generatedBy: req.user!.userId,
    })
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getComplianceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await svc.getComplianceReport(req.params['id'] as string),
    })
  } catch (err) {
    next(err)
  }
}
