import { create } from 'zustand'
import type { ISellerProfile, ISellerDashboard, ISellerEarnings } from '../../shared/types/index.js'

interface SellerState {
  profile: ISellerProfile | null
  dashboard: ISellerDashboard | null
  earnings: ISellerEarnings | null
  isOnboarded: boolean

  setProfile: (p: ISellerProfile | null) => void
  setDashboard: (d: ISellerDashboard | null) => void
  setEarnings: (e: ISellerEarnings | null) => void
  setOnboarded: (v: boolean) => void
  reset: () => void
}

export const useSellerStore = create<SellerState>((set) => ({
  profile: null,
  dashboard: null,
  earnings: null,
  isOnboarded: false,

  setProfile: (profile) => set({ profile, isOnboarded: !!profile }),
  setDashboard: (dashboard) => set({ dashboard }),
  setEarnings: (earnings) => set({ earnings }),
  setOnboarded: (v) => set({ isOnboarded: v }),
  reset: () => set({ profile: null, dashboard: null, earnings: null, isOnboarded: false }),
}))
