import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowApi } from '../services/workflowService.js'

const KEYS = {
  list: (p: Record<string, unknown>) => ['workflows', 'list', p] as const,
  detail: (id: string) => ['workflows', 'detail', id] as const,
  executions: (p: Record<string, unknown>) => ['workflows', 'executions', p] as const,
  templates: (p: Record<string, unknown>) => ['workflows', 'templates', p] as const,
  approvals: (p: Record<string, unknown>) => ['workflows', 'approvals', p] as const,
  analytics: (id: string) => ['workflows', 'analytics', id] as const,
  globalAnalytics: ['workflows', 'analytics', 'global'] as const,
  auditLog: (id: string) => ['workflows', 'audit', id] as const,
  history: (id: string) => ['workflows', 'history', id] as const,
}

export const useWorkflows = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => workflowApi.list(params).then((r) => r.data),
    retry: false,
  })

export const useWorkflow = (id: string) =>
  useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => workflowApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  })

export const useCreateWorkflow = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => workflowApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  })
}

export const useUpdateWorkflow = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => workflowApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows', 'list'] })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export const useDeleteWorkflow = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  })
}

export const usePublishWorkflow = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowApi.publish(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  })
}

export const usePauseWorkflow = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowApi.pause(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  })
}

export const useResumeWorkflow = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowApi.resume(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  })
}

export const useExecuteWorkflow = () =>
  useMutation({
    mutationFn: ({ id, triggerData }: { id: string; triggerData?: Record<string, unknown> }) =>
      workflowApi.execute(id, triggerData).then((r) => r.data.data),
  })

export const useWorkflowExecutions = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.executions(params),
    queryFn: () => workflowApi.listExecutions(params).then((r) => r.data),
    retry: false,
  })

export const useWorkflowTemplates = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.templates(params),
    queryFn: () => workflowApi.listTemplates(params).then((r) => r.data.data ?? r.data),
    retry: false,
  })

export const useCreateTemplate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => workflowApi.createTemplate(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'templates'] }),
  })
}

export const useInstantiateTemplate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: unknown }) =>
      workflowApi.instantiateTemplate(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  })
}

export const useWorkflowApprovals = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.approvals(params),
    queryFn: () => workflowApi.listApprovals(params).then((r) => r.data),
    retry: false,
  })

export const useProcessApproval = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string
      decision: 'approved' | 'rejected'
      reason?: string
    }) => workflowApi.processApproval(id, { decision, reason }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'approvals'] }),
  })
}

export const useEscalateApproval = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, escalateTo }: { id: string; escalateTo: string[] }) =>
      workflowApi.escalateApproval(id, { escalateTo }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', 'approvals'] }),
  })
}

export const useWorkflowAnalytics = (id: string) =>
  useQuery({
    queryKey: KEYS.analytics(id),
    queryFn: () => workflowApi.getAnalytics(id).then((r) => r.data.data),
    enabled: !!id,
    retry: false,
  })

export const useGlobalWorkflowAnalytics = () =>
  useQuery({
    queryKey: KEYS.globalAnalytics,
    queryFn: () => workflowApi.getGlobalAnalytics().then((r) => r.data.data),
    retry: false,
  })

export const useWorkflowAuditLog = (id: string) =>
  useQuery({
    queryKey: KEYS.auditLog(id),
    queryFn: () => workflowApi.getAuditLog(id).then((r) => r.data.data ?? r.data),
    enabled: !!id,
    retry: false,
  })

export const useWorkflowHistory = (id: string) =>
  useQuery({
    queryKey: KEYS.history(id),
    queryFn: () => workflowApi.getHistory(id).then((r) => r.data.data ?? r.data),
    enabled: !!id,
    retry: false,
  })
