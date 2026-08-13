import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { iamService } from '../services/iamService.js'
import type {
  CreateRoleRequest,
  CreatePermissionRequest,
  CreateSecurityPolicyRequest,
  AssignRoleRequest,
  CreateOrganizationRequest,
  CreateTeamRequest,
  GenerateComplianceReportRequest,
} from '../../shared/types/iam.types.js'

const KEYS = {
  summary: ['iam', 'summary'] as const,
  permissions: ['iam', 'permissions'] as const,
  roles: ['iam', 'roles'] as const,
  assignments: ['iam', 'assignments'] as const,
  policies: ['iam', 'policies'] as const,
  events: (page: number, severity?: string) => ['iam', 'events', page, severity] as const,
  organizations: ['iam', 'organizations'] as const,
  teams: (orgId?: string) => ['iam', 'teams', orgId] as const,
  sessions: (page: number) => ['iam', 'sessions', page] as const,
  userSessions: (userId: string) => ['iam', 'sessions', 'user', userId] as const,
  devices: (userId: string) => ['iam', 'devices', userId] as const,
  mfaStatus: (userId?: string) => ['iam', 'mfa', 'status', userId] as const,
  riskEvents: (page: number, level?: string) => ['iam', 'risk', page, level] as const,
  compliance: (page: number) => ['iam', 'compliance', page] as const,
  complianceReport: (id: string) => ['iam', 'compliance', id] as const,
}

// ── Summary ───────────────────────────────────────────────────────────────────

export const useIamSummary = () =>
  useQuery({ queryKey: KEYS.summary, queryFn: iamService.getSummary, retry: false })

// ── Permissions ───────────────────────────────────────────────────────────────

export const usePermissions = () =>
  useQuery({ queryKey: KEYS.permissions, queryFn: iamService.listPermissions, retry: false })

export const useCreatePermission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePermissionRequest) => iamService.createPermission(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.permissions }),
  })
}

export const useDeletePermission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.deletePermission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.permissions })
      qc.invalidateQueries({ queryKey: KEYS.roles })
    },
  })
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export const useRoles = () =>
  useQuery({ queryKey: KEYS.roles, queryFn: iamService.listRoles, retry: false })

export const useRole = (id: string) =>
  useQuery({
    queryKey: [...KEYS.roles, id],
    queryFn: () => iamService.getRole(id),
    retry: false,
    enabled: !!id,
  })

export const useCreateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => iamService.createRole(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.roles }),
  })
}

export const useUpdateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoleRequest> }) =>
      iamService.updateRole(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.roles }),
  })
}

export const useDeleteRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.roles }),
  })
}

// ── Assignments ───────────────────────────────────────────────────────────────

export const useAssignments = () =>
  useQuery({
    queryKey: KEYS.assignments,
    queryFn: () => iamService.listAssignments(),
    retry: false,
  })

export const useAssignRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignRoleRequest) => iamService.assignRole(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.assignments }),
  })
}

export const useRevokeRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      iamService.revokeRole(userId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.assignments }),
  })
}

// ── Security Policies ─────────────────────────────────────────────────────────

export const useSecurityPolicies = () =>
  useQuery({ queryKey: KEYS.policies, queryFn: iamService.listPolicies, retry: false })

export const useCreatePolicy = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSecurityPolicyRequest) => iamService.createPolicy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.policies })
      qc.invalidateQueries({ queryKey: KEYS.summary })
    },
  })
}

export const useUpdatePolicy = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<CreateSecurityPolicyRequest> & { isActive?: boolean }
    }) => iamService.updatePolicy(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.policies }),
  })
}

export const useDeletePolicy = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.deletePolicy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.policies })
      qc.invalidateQueries({ queryKey: KEYS.summary })
    },
  })
}

// ── Security Events ───────────────────────────────────────────────────────────

export const useSecurityEvents = (page = 1, severity?: string) =>
  useQuery({
    queryKey: KEYS.events(page, severity),
    queryFn: () => iamService.getSecurityEvents(page, severity),
    retry: false,
  })

// ── Organizations ─────────────────────────────────────────────────────────────

export const useOrganizations = () =>
  useQuery({ queryKey: KEYS.organizations, queryFn: iamService.listOrganizations, retry: false })

export const useCreateOrganization = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => iamService.createOrganization(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.organizations }),
  })
}

export const useAddOrgMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      iamService.addOrgMember(orgId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.organizations }),
  })
}

export const useRemoveOrgMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      iamService.removeOrgMember(orgId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.organizations }),
  })
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export const useTeams = (orgId?: string) =>
  useQuery({
    queryKey: KEYS.teams(orgId),
    queryFn: () => iamService.listTeams(orgId),
    retry: false,
  })

export const useCreateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTeamRequest) => iamService.createTeam(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'teams'] }),
  })
}

export const useDeleteTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'teams'] }),
  })
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export const useAllSessions = (page = 1) =>
  useQuery({
    queryKey: KEYS.sessions(page),
    queryFn: () => iamService.listAllSessions(page),
    retry: false,
  })

export const useUserSessions = (userId: string) =>
  useQuery({
    queryKey: KEYS.userSessions(userId),
    queryFn: () => iamService.listUserSessions(userId),
    enabled: !!userId,
    retry: false,
  })

export const useRevokeSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'sessions'] }),
  })
}

export const useRevokeAllUserSessions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => iamService.revokeAllUserSessions(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'sessions'] }),
  })
}

// ── Devices ───────────────────────────────────────────────────────────────────

export const useUserDevices = (userId: string) =>
  useQuery({
    queryKey: KEYS.devices(userId),
    queryFn: () => iamService.listUserDevices(userId),
    enabled: !!userId,
    retry: false,
  })

export const useTrustDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.trustDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'devices'] }),
  })
}

export const useRevokeDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.revokeDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'devices'] }),
  })
}

// ── MFA ───────────────────────────────────────────────────────────────────────

export const useSetupMfa = () =>
  useMutation({
    mutationFn: (userId?: string) => iamService.setupMfa(userId),
  })

export const useVerifyMfa = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId?: string }) =>
      iamService.verifyMfa(token, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'mfa'] }),
  })
}

export const useDisableMfa = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId?: string) => iamService.disableMfa(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'mfa'] }),
  })
}

export const useMfaStatus = (userId?: string) =>
  useQuery({
    queryKey: KEYS.mfaStatus(userId),
    queryFn: () => iamService.getMfaStatus(userId),
    retry: false,
  })

// ── Risk Events ───────────────────────────────────────────────────────────────

export const useRiskEvents = (page = 1, riskLevel?: string) =>
  useQuery({
    queryKey: KEYS.riskEvents(page, riskLevel),
    queryFn: () => iamService.listRiskEvents(page, riskLevel),
    retry: false,
  })

export const useResolveRiskEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => iamService.resolveRiskEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'risk'] }),
  })
}

// ── Compliance Reports ────────────────────────────────────────────────────────

export const useComplianceReports = (page = 1) =>
  useQuery({
    queryKey: KEYS.compliance(page),
    queryFn: () => iamService.listComplianceReports(page),
    retry: false,
  })

export const useComplianceReport = (id: string) =>
  useQuery({
    queryKey: KEYS.complianceReport(id),
    queryFn: () => iamService.getComplianceReport(id),
    enabled: !!id,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as { status?: string } | undefined
      return data?.status === 'pending' || data?.status === 'generating' ? 3000 : false
    },
  })

export const useGenerateComplianceReport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateComplianceReportRequest) =>
      iamService.generateComplianceReport(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'compliance'] }),
  })
}
