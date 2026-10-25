import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IProduct } from '../../shared/types/product.types.js'
import type { IGuestCartItem, IServerCart, ICartTotals } from '../../shared/types/cart.types.js'
import { FLAT_TAX_FEE_CLIENT } from '../config/cart.constants.js'

interface CartItemOptions {
  selectedVariant?: string
  selectedSize?: string
  selectedColor?: string
}

interface CartStore {
  // ── Guest cart (persisted, pre-auth) ──────────────────
  guestItems: IGuestCartItem[]

  // ── Server cart (set from React Query responses) ──────
  serverCart: IServerCart | null

  // ── Actions: guest ────────────────────────────────────
  addGuestItem: (product: IProduct, quantity?: number, opts?: CartItemOptions) => void
  removeGuestItem: (productId: string) => void
  updateGuestQty: (productId: string, qty: number) => void
  clearGuestCart: () => void

  // ── Actions: server ───────────────────────────────────
  setServerCart: (cart: IServerCart) => void
  updateServerQty: (productId: string, qty: number) => void
  removeServerItem: (productId: string) => void
  clearServerCart: () => void

  // ── Computed ──────────────────────────────────────────
  totalItems: () => number
  guestTotals: () => ICartTotals
}

const calcGuestTotals = (items: IGuestCartItem[]): ICartTotals => {
  const subtotal = items.reduce((sum, i) => {
    const price =
      i.product.discountPrice && i.product.discountPrice < i.product.price
        ? i.product.discountPrice
        : i.product.price
    return sum + price * i.quantity
  }, 0)

  const discountAmount = 0
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const shippingCost = 0
  const taxAmount = subtotal === 0 ? 0 : FLAT_TAX_FEE_CLIENT
  const grandTotal = Math.round((afterDiscount + shippingCost + taxAmount) * 100) / 100
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount,
    shippingCost,
    taxAmount,
    grandTotal,
    totalItems,
    isFreeShipping: false,
    freeShippingThreshold: 0,
    remainingForFreeShipping: 0,
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      guestItems: [],
      serverCart: null,

      // ── Guest actions ──────────────────────────────────
      addGuestItem: (product, quantity = 1, opts = {}) =>
        set((state) => {
          const { selectedVariant, selectedSize, selectedColor } = opts
          const existing = state.guestItems.find(
            (i) =>
              i.product._id === product._id &&
              i.selectedVariant === selectedVariant &&
              i.selectedSize === selectedSize &&
              i.selectedColor === selectedColor,
          )
          const maxQty = product.stockQuantity

          if (existing) {
            return {
              guestItems: state.guestItems.map((i) =>
                i.product._id === product._id
                  ? { ...i, quantity: Math.min(i.quantity + quantity, maxQty) }
                  : i,
              ),
            }
          }
          return {
            guestItems: [
              ...state.guestItems,
              {
                product,
                quantity: Math.min(quantity, maxQty),
                selectedVariant,
                selectedSize,
                selectedColor,
              },
            ],
          }
        }),

      removeGuestItem: (productId) =>
        set((state) => ({
          guestItems: state.guestItems.filter((i) => i.product._id !== productId),
        })),

      updateGuestQty: (productId, qty) =>
        set((state) => ({
          guestItems:
            qty <= 0
              ? state.guestItems.filter((i) => i.product._id !== productId)
              : state.guestItems.map((i) =>
                  i.product._id === productId
                    ? { ...i, quantity: Math.min(qty, i.product.stockQuantity) }
                    : i,
                ),
        })),

      clearGuestCart: () => set({ guestItems: [] }),

      // ── Server actions ─────────────────────────────────
      setServerCart: (cart) => set({ serverCart: cart }),
      updateServerQty: (productId, qty) =>
        set((state) => {
          if (!state.serverCart) return {}
          const newItems =
            qty <= 0
              ? state.serverCart.items.filter((i) => {
                  const pid =
                    typeof i.productId === 'object' ? (i.productId as any)._id : i.productId
                  return pid !== productId
                })
              : state.serverCart.items.map((i) => {
                  const pid =
                    typeof i.productId === 'object' ? (i.productId as any)._id : i.productId
                  return pid === productId ? { ...i, quantity: qty } : i
                })
          const newCartTotal = newItems.reduce((sum, i) => sum + i.itemPrice * i.quantity, 0)
          return {
            serverCart: {
              ...state.serverCart,
              items: newItems,
              cartTotal: newCartTotal,
              grandTotal: Math.max(
                0,
                newCartTotal -
                  state.serverCart.discountAmount +
                  state.serverCart.shippingCost +
                  state.serverCart.taxAmount,
              ),
            },
          }
        }),
      removeServerItem: (productId) =>
        set((state) => {
          if (!state.serverCart) return {}
          const newItems = state.serverCart.items.filter((i) => {
            const pid = typeof i.productId === 'object' ? (i.productId as any)._id : i.productId
            return pid !== productId
          })
          const newCartTotal = newItems.reduce((sum, i) => sum + i.itemPrice * i.quantity, 0)
          return {
            serverCart: {
              ...state.serverCart,
              items: newItems,
              cartTotal: newCartTotal,
              grandTotal: Math.max(
                0,
                newCartTotal -
                  state.serverCart.discountAmount +
                  state.serverCart.shippingCost +
                  state.serverCart.taxAmount,
              ),
            },
          }
        }),
      clearServerCart: () => set({ serverCart: null }),

      // ── Computed ───────────────────────────────────────
      totalItems: () => {
        const { serverCart, guestItems } = get()
        if (serverCart) {
          return serverCart.items.reduce((sum, i) => sum + i.quantity, 0)
        }
        return guestItems.reduce((sum, i) => sum + i.quantity, 0)
      },

      guestTotals: () => calcGuestTotals(get().guestItems),
    }),
    {
      name: 'cartiva-cart',
      partialize: (state) => ({
        guestItems: state.guestItems,
        serverCart: state.serverCart,
      }),
    },
  ),
)
