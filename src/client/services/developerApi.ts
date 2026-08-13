import api from './api.js'

// Developer Applications
export const getApplications = async () => {
  const res = await api.get('/developer/applications')
  return res.data
}

export const createApplication = async (data: {
  name: string
  description?: string
  environment?: string
  scopes?: string[]
}) => {
  const res = await api.post('/developer/applications', data)
  return res.data
}

export const updateApplication = async (id: string, data: Record<string, unknown>) => {
  const res = await api.put(`/developer/applications/${id}`, data)
  return res.data
}

export const deleteApplication = async (id: string) => {
  const res = await api.delete(`/developer/applications/${id}`)
  return res.data
}

// API Keys
export const getApiKeys = async () => {
  const res = await api.get('/developer/api-keys')
  return res.data
}

export const createApiKey = async (data: {
  name: string
  applicationId?: string
  scopes?: string[]
  environment?: string
  expiresInDays?: number
  rateLimitRequestsPerMin?: number
}) => {
  const res = await api.post('/developer/api-keys', data)
  return res.data
}

export const rotateApiKey = async (id: string) => {
  const res = await api.post(`/developer/api-keys/${id}/rotate`)
  return res.data
}

export const revokeApiKey = async (id: string) => {
  const res = await api.delete(`/developer/api-keys/${id}`)
  return res.data
}

// Webhooks
export const getWebhooks = async () => {
  const res = await api.get('/developer/webhooks')
  return res.data
}

export const createWebhook = async (data: {
  url: string
  events: string[]
  description?: string
  applicationId?: string
}) => {
  const res = await api.post('/developer/webhooks', data)
  return res.data
}

export const updateWebhook = async (id: string, data: Record<string, unknown>) => {
  const res = await api.put(`/developer/webhooks/${id}`, data)
  return res.data
}

export const deleteWebhook = async (id: string) => {
  const res = await api.delete(`/developer/webhooks/${id}`)
  return res.data
}

export const testWebhook = async (id: string, eventType?: string) => {
  const res = await api.post(`/developer/webhooks/${id}/test`, { eventType })
  return res.data
}

export const getWebhookDeliveries = async (id: string) => {
  const res = await api.get(`/developer/webhooks/${id}/deliveries`)
  return res.data
}

export const retryWebhookDelivery = async (deliveryId: string) => {
  const res = await api.post(`/developer/webhooks/deliveries/${deliveryId}/retry`)
  return res.data
}

// Integrations
export const getIntegrations = async () => {
  const res = await api.get('/integrations')
  return res.data
}

export const testIntegration = async (id: string) => {
  const res = await api.post(`/integrations/${id}/test`)
  return res.data
}

// Analytics & Documentation
export const getApiAnalytics = async () => {
  const res = await api.get('/api-management/analytics')
  return res.data
}

export const getOpenApiSpec = async () => {
  const res = await api.get('/api-management/openapi.json')
  return res.data
}
