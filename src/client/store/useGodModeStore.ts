import { create } from 'zustand'
import * as godmodeApi from '../services/godmodeApi.js'

interface GodModeState {
  globalEconomicState: any | null
  economyHistory: any[]
  systemDecisions: any[]
  evolutionHistory: any[]
  ruleVersions: any[]
  status: any | null
  loading: boolean
  error: string | null

  fetchStatus: () => Promise<void>
  fetchEconomyState: () => Promise<void>
  fetchSystemHealth: () => Promise<void>
  fetchRuleVersions: () => Promise<void>
  triggerObserve: () => Promise<void>
  triggerSimulate: () => Promise<void>
  triggerDecide: () => Promise<void>
  triggerExecute: () => Promise<void>
  triggerEvolve: () => Promise<void>
}

export const useGodModeStore = create<GodModeState>((set) => ({
  globalEconomicState: null,
  economyHistory: [],
  systemDecisions: [],
  evolutionHistory: [],
  ruleVersions: [],
  status: null,
  loading: false,
  error: null,

  fetchStatus: async () => {
    try {
      const res = await godmodeApi.getStatus()
      set({ status: res.data })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  fetchEconomyState: async () => {
    set({ loading: true, error: null })
    try {
      const res = await godmodeApi.getEconomyState()
      set({
        globalEconomicState: res.data?.current || null,
        economyHistory: res.data?.history || [],
        loading: false,
      })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchSystemHealth: async () => {
    try {
      const res = await godmodeApi.getSystemHealth()
      set({
        systemDecisions: res.data?.recentDecisions || [],
        evolutionHistory: res.data?.lastCycle ? [res.data.lastCycle] : [],
      })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  fetchRuleVersions: async () => {
    try {
      const res = await godmodeApi.getRuleVersions()
      set({ ruleVersions: res.data || [] })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  triggerObserve: async () => {
    set({ loading: true })
    try {
      const res = await godmodeApi.observe()
      set({ globalEconomicState: res.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  triggerSimulate: async () => {
    set({ loading: true })
    try {
      await godmodeApi.simulate()
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  triggerDecide: async () => {
    set({ loading: true })
    try {
      await godmodeApi.decide()
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  triggerExecute: async () => {
    set({ loading: true })
    try {
      await godmodeApi.execute()
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  triggerEvolve: async () => {
    set({ loading: true })
    try {
      await godmodeApi.evolve()
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },
}))
