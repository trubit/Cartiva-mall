import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IWishlistItem } from '../../shared/types/dashboard.types.js'
import type { IProduct } from '../../shared/types/product.types.js'

interface DashboardStore {
  // ── Wishlist ─────────────────────────────────
  wishlistItems: IWishlistItem[]
  wishlistCount: number
  setWishlist: (items: IWishlistItem[]) => void
  addToWishlist: (item: IWishlistItem) => void
  removeFromWishlist: (productId: string) => void

  // ── Notifications ────────────────────────────
  unreadCount: number
  setUnreadCount: (n: number) => void
  incrementUnreadCount: () => void
  decrementUnreadCount: () => void
  resetUnreadCount: () => void

  // ── Recently Viewed ──────────────────────────
  recentProducts: IProduct[]
  setRecentProducts: (products: IProduct[]) => void

  // ── Lifecycle ────────────────────────────────
  clearAll: () => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      wishlistItems: [],
      wishlistCount: 0,

      setWishlist: (items) => set({ wishlistItems: items, wishlistCount: items.length }),

      addToWishlist: (item) =>
        set((state) => {
          const already = state.wishlistItems.some((i) => i.productId._id === item.productId._id)
          if (already) return state
          const next = [item, ...state.wishlistItems]
          return { wishlistItems: next, wishlistCount: next.length }
        }),

      removeFromWishlist: (productId) =>
        set((state) => {
          const next = state.wishlistItems.filter((i) => i.productId._id !== productId)
          return { wishlistItems: next, wishlistCount: next.length }
        }),

      unreadCount: 0,
      setUnreadCount: (n) => set({ unreadCount: n }),
      incrementUnreadCount: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
      decrementUnreadCount: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
      resetUnreadCount: () => set({ unreadCount: 0 }),

      recentProducts: [],
      setRecentProducts: (products) => set({ recentProducts: products }),

      clearAll: () =>
        set({ wishlistItems: [], wishlistCount: 0, unreadCount: 0, recentProducts: [] }),
    }),
    {
      name: 'cartiva-dashboard',
      partialize: (state) => ({
        wishlistItems: state.wishlistItems,
        wishlistCount: state.wishlistCount,
        unreadCount: state.unreadCount,
      }),
    },
  ),
)
