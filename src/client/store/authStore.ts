import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IUser } from '../../shared/types/user.types.js'

interface AuthState {
  user: IUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: IUser, token: string) => void
  updateUser: (partial: Partial<IUser>) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => {
        // Never write the access token to localStorage — it is kept in memory only
        // to protect against XSS exfiltration. Refresh tokens use httpOnly cookies.
        set({ user, accessToken, isAuthenticated: true })
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'cartiva-auth',
      // Only persist user identity (not the token) so the next page load
      // can show the user as logged in while the token is refreshed from cookie.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
