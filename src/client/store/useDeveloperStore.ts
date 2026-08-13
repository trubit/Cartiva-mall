import { create } from 'zustand'
import * as developerApi from '../services/developerApi.js'

interface DeveloperState {
  applications: any[]
  apiKeys: any[]
  webhooks: any[]
  integrations: any[]
  analytics: any | null
  openApiSpec: any | null
  loading: boolean
  error: string | null
  rawSecretKey: string | null

  fetchApplications: () => Promise<void>
  fetchApiKeys: () => Promise<void>
  fetchWebhooks: () => Promise<void>
  fetchIntegrations: () => Promise<void>
  fetchAnalytics: () => Promise<void>
  fetchOpenApiSpec: () => Promise<void>
  clearRawSecretKey: () => void
}

export const useDeveloperStore = create<DeveloperState>((set) => ({
  applications: [],
  apiKeys: [],
  webhooks: [],
  integrations: [],
  analytics: null,
  openApiSpec: null,
  loading: false,
  error: null,
  rawSecretKey: null,

  fetchApplications: async () => {
    set({ loading: true, error: null })
    try {
      const res = await developerApi.getApplications()
      set({ applications: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchApiKeys: async () => {
    set({ loading: true, error: null })
    try {
      const res = await developerApi.getApiKeys()
      set({ apiKeys: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchWebhooks: async () => {
    set({ loading: true, error: null })
    try {
      const res = await developerApi.getWebhooks()
      set({ webhooks: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchIntegrations: async () => {
    set({ loading: true, error: null })
    try {
      const res = await developerApi.getIntegrations()
      set({ integrations: res.data || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchAnalytics: async () => {
    try {
      const res = await developerApi.getApiAnalytics()
      set({ analytics: res.data })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  fetchOpenApiSpec: async () => {
    try {
      const res = await developerApi.getOpenApiSpec()
      set({ openApiSpec: res })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  clearRawSecretKey: () => set({ rawSecretKey: null }),
}))
