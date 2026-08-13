import api from './api.js'
import type {
  IamSummary,
  IPermission,
  IRole,
  ISecurityPolicy,
  ISecurityEvent,
  IUserRoleAssignment,
  IOrganization,
  ITeam,
  ISession,
  IDevice,
  IMfaSetupResult,
  IMfaStatus,
  IRiskEvent,
  IComplianceReport,
  CreateRoleRequest,
  CreatePermissionRequest,
  CreateSecurityPolicyRequest,
  AssignRoleRequest,
  CreateOrganizationRequest,
  CreateTeamRequest,
  GenerateComplianceReportRequest,
} from '../../shared/types/iam.types.js'

type Paginated<T> = { success: boolean; items: T[]; total: number }
type Single<T> = { success: boolean; data: T }
type List<T> = { success: boolean; data: T[] }

export const iamService = {
  // ── Summary ──────────────────────────────────────────────────────────────
  getSummary: () => api.get<Single<IamSummary>>('/iam/summary').then((r) => r.data.data),

  // ── Permissions ───────────────────────────────────────────────────────────
  listPermissions: () => api.get<List<IPermission>>('/iam/permissions').then((r) => r.data.data),
  createPermission: (data: CreatePermissionRequest) =>
    api.post<Single<IPermission>>('/iam/permissions', data).then((r) => r.data.data),
  deletePermission: (id: string) => api.delete(`/iam/permissions/${id}`),

  // ── Roles ─────────────────────────────────────────────────────────────────
  listRoles: () => api.get<List<IRole>>('/iam/roles').then((r) => r.data.data),
  getRole: (id: string) => api.get<Single<IRole>>(`/iam/roles/${id}`).then((r) => r.data.data),
  createRole: (data: CreateRoleRequest) =>
    api.post<Single<IRole>>('/iam/roles', data).then((r) => r.data.data),
  updateRole: (id: string, data: Partial<CreateRoleRequest>) =>
    api.put<Single<IRole>>(`/iam/roles/${id}`, data).then((r) => r.data.data),
  deleteRole: (id: string) => api.delete(`/iam/roles/${id}`),

  // ── Assignments ───────────────────────────────────────────────────────────
  assignRole: (data: AssignRoleRequest) =>
    api.post<Single<IUserRoleAssignment>>('/iam/assignments', data).then((r) => r.data.data),
  revokeRole: (userId: string, roleId: string) =>
    api.delete(`/iam/assignments/user/${userId}/role/${roleId}`),
  getUserRoles: (userId: string) =>
    api.get<List<IUserRoleAssignment>>(`/iam/assignments/user/${userId}`).then((r) => r.data.data),
  listAssignments: (page = 1) =>
    api
      .get<Paginated<IUserRoleAssignment>>('/iam/assignments', { params: { page } })
      .then((r) => r.data),

  // ── Security Policies ─────────────────────────────────────────────────────
  listPolicies: () => api.get<List<ISecurityPolicy>>('/iam/policies').then((r) => r.data.data),
  createPolicy: (data: CreateSecurityPolicyRequest) =>
    api.post<Single<ISecurityPolicy>>('/iam/policies', data).then((r) => r.data.data),
  updatePolicy: (id: string, data: Partial<CreateSecurityPolicyRequest> & { isActive?: boolean }) =>
    api.put<Single<ISecurityPolicy>>(`/iam/policies/${id}`, data).then((r) => r.data.data),
  deletePolicy: (id: string) => api.delete(`/iam/policies/${id}`),

  // ── Security Events ───────────────────────────────────────────────────────
  getSecurityEvents: (page = 1, severity?: string) =>
    api
      .get<Paginated<ISecurityEvent>>('/iam/events', {
        params: { page, ...(severity ? { severity } : {}) },
      })
      .then((r) => r.data),

  // ── Organizations ─────────────────────────────────────────────────────────
  listOrganizations: () =>
    api.get<List<IOrganization>>('/iam/organizations').then((r) => r.data.data),
  createOrganization: (data: CreateOrganizationRequest) =>
    api.post<Single<IOrganization>>('/iam/organizations', data).then((r) => r.data.data),
  addOrgMember: (orgId: string, userId: string) =>
    api
      .post<Single<IOrganization>>(`/iam/organizations/${orgId}/members`, { userId })
      .then((r) => r.data.data),
  removeOrgMember: (orgId: string, userId: string) =>
    api
      .delete<Single<IOrganization>>(`/iam/organizations/${orgId}/members/${userId}`)
      .then((r) => r.data.data),

  // ── Teams ─────────────────────────────────────────────────────────────────
  listTeams: (orgId?: string) =>
    api.get<List<ITeam>>('/iam/teams', { params: orgId ? { orgId } : {} }).then((r) => r.data.data),
  createTeam: (data: CreateTeamRequest) =>
    api.post<Single<ITeam>>('/iam/teams', data).then((r) => r.data.data),
  deleteTeam: (id: string) => api.delete(`/iam/teams/${id}`),

  // ── Sessions ─────────────────────────────────────────────────────────────
  listAllSessions: (page = 1) =>
    api.get<Paginated<ISession>>('/iam/sessions', { params: { page } }).then((r) => r.data),
  listUserSessions: (userId: string) =>
    api.get<List<ISession>>(`/iam/sessions/user/${userId}`).then((r) => r.data.data),
  revokeSession: (id: string) => api.delete(`/iam/sessions/${id}`),
  revokeAllUserSessions: (userId: string) => api.delete(`/iam/sessions/user/${userId}/all`),

  // ── Devices ───────────────────────────────────────────────────────────────
  listUserDevices: (userId: string) =>
    api.get<List<IDevice>>(`/iam/devices/user/${userId}`).then((r) => r.data.data),
  trustDevice: (id: string) =>
    api.post<Single<IDevice>>(`/iam/devices/${id}/trust`).then((r) => r.data.data),
  revokeDevice: (id: string) => api.delete(`/iam/devices/${id}`),

  // ── MFA ───────────────────────────────────────────────────────────────────
  setupMfa: (userId?: string) =>
    api
      .post<Single<IMfaSetupResult>>(userId ? `/iam/mfa/${userId}/setup` : '/iam/mfa/setup')
      .then((r) => r.data.data),
  verifyMfa: (token: string, userId?: string) =>
    api
      .post<
        Single<{ enabled: boolean }>
      >(userId ? `/iam/mfa/${userId}/verify` : '/iam/mfa/verify', { token })
      .then((r) => r.data.data),
  disableMfa: (userId?: string) =>
    api.delete(userId ? `/iam/mfa/${userId}/disable` : '/iam/mfa/disable'),
  getMfaStatus: (userId?: string) =>
    api
      .get<Single<IMfaStatus>>(userId ? `/iam/mfa/${userId}/status` : '/iam/mfa/status')
      .then((r) => r.data.data),

  // ── Risk Events ───────────────────────────────────────────────────────────
  listRiskEvents: (page = 1, riskLevel?: string) =>
    api
      .get<Paginated<IRiskEvent>>('/iam/risk-events', {
        params: { page, ...(riskLevel ? { riskLevel } : {}) },
      })
      .then((r) => r.data),
  resolveRiskEvent: (id: string) =>
    api.post<Single<IRiskEvent>>(`/iam/risk-events/${id}/resolve`).then((r) => r.data.data),

  // ── Compliance Reports ────────────────────────────────────────────────────
  listComplianceReports: (page = 1) =>
    api
      .get<Paginated<IComplianceReport>>('/iam/compliance', { params: { page } })
      .then((r) => r.data),
  generateComplianceReport: (data: GenerateComplianceReportRequest) =>
    api.post<Single<IComplianceReport>>('/iam/compliance', data).then((r) => r.data.data),
  getComplianceReport: (id: string) =>
    api.get<Single<IComplianceReport>>(`/iam/compliance/${id}`).then((r) => r.data.data),
}
