import api from './api.js'

export const workflowApi = {
  create: (data: unknown) => api.post('/workflows', data),
  list: (params?: Record<string, unknown>) => api.get('/workflows', { params }),
  get: (id: string) => api.get(`/workflows/${id}`),
  update: (id: string, data: unknown) => api.put(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  publish: (id: string) => api.post(`/workflows/${id}/publish`),
  pause: (id: string) => api.post(`/workflows/${id}/pause`),
  resume: (id: string) => api.post(`/workflows/${id}/resume`),
  execute: (id: string, triggerData?: Record<string, unknown>) =>
    api.post(`/workflows/${id}/execute`, { triggerData }),
  getHistory: (id: string) => api.get(`/workflows/${id}/history`),
  getAuditLog: (id: string) => api.get(`/workflows/${id}/audit`),
  getAnalytics: (id: string) => api.get(`/workflows/${id}/analytics`),
  getGlobalAnalytics: () => api.get('/workflows/analytics/global'),

  listExecutions: (params?: Record<string, unknown>) =>
    api.get('/workflows/executions/list', { params }),
  cancelExecution: (id: string) => api.post(`/workflows/executions/${id}/cancel`),

  listTemplates: (params?: Record<string, unknown>) => api.get('/workflows/templates', { params }),
  createTemplate: (data: unknown) => api.post('/workflows/templates', data),
  instantiateTemplate: (id: string, data?: unknown) =>
    api.post(`/workflows/templates/${id}/instantiate`, data ?? {}),

  listApprovals: (params?: Record<string, unknown>) => api.get('/workflows/approvals', { params }),
  processApproval: (id: string, data: { decision: 'approved' | 'rejected'; reason?: string }) =>
    api.post(`/workflows/approvals/${id}/process`, data),
  escalateApproval: (id: string, data: { escalateTo: string[] }) =>
    api.post(`/workflows/approvals/${id}/escalate`, data),
}
