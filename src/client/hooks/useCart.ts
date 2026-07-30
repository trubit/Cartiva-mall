import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore.js'
import { useCartStore } from '../store/cartStore.js'
import { cartService } from '../services/cartService.js'
import type { IServerCart, ICartDisplayItem, ICartTotals } from '../../shared/types/cart.types.js'
import type { IProduct } from '../../shared/types/product.types.js'
import type { AddToCartInput } from '../../shared/validators/cart.validators.js'
import { FREE_SHIPPING_THRESHOLD_CLIENT } from '../config/cart.constants.js'

export const CART_KEY = ['cart'] as const

// ─── React Query — server cart ────────────────────────────────────────────────
export const useServerCart = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { setServerCart, serverCart: persistedCart } = useCartStore()

  return useQuery({
    queryKey: CART_KEY,
    queryFn: async () => {
      const cart = await cartService.getCart()
      setServerCart(cart)
      return cart
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    // Use the Zustand-persisted cart as initial data so the cart shows
    // immediately on page refresh, while a background refetch updates it.
    initialData: persistedCart ?? undefined,
    initialDataUpdatedAt: 0, // Always treat as stale → always background-refetch
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export const useAddToCartMutation = () => {
  const qc = useQueryClient()
  const setServerCart = useCartStore((s) => s.setServerCart)

  return useMutation({
    mutationFn: (input: AddToCartInput) => cartService.addToCart(input),
    onSuccess: (cart: IServerCart) => {
      setServerCart(cart)
      qc.setQueryData(CART_KEY, cart)
    },
  })
}

export const useUpdateCartItemMutation = () => {
  const qc = useQueryClient()
  const setServerCart = useCartStore((s) => s.setServerCart)

  return useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) =>
      cartService.updateCartItem(productId, { quantity: qty }),
    onSuccess: (cart: IServerCart) => {
      setServerCart(cart)
      qc.setQueryData(CART_KEY, cart)
    },
  })
}

export const useRemoveFromCartMutation = () => {
  const qc = useQueryClient()
  const setServerCart = useCartStore((s) => s.setServerCart)

  return useMutation({
    mutationFn: (productId: string) => cartService.removeFromCart(productId),
    onSuccess: (cart: IServerCart) => {
      setServerCart(cart)
      qc.setQueryData(CART_KEY, cart)
    },
  })
}

export const useClearCartMutation = () => {
  const qc = useQueryClient()
  const clearServerCart = useCartStore((s) => s.clearServerCart)

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      clearServerCart()
      qc.removeQueries({ queryKey: CART_KEY })
    },
  })
}

export const useSyncCartMutation = () => {
  const qc = useQueryClient()
  const setServerCart = useCartStore((s) => s.setServerCart)
  const clearGuestCart = useCartStore((s) => s.clearGuestCart)

  return useMutation({
    mutationFn: cartService.syncCart,
    onSuccess: (cart: IServerCart) => {
      setServerCart(cart)
      qc.setQueryData(CART_KEY, cart)
      clearGuestCart()
    },
  })
}

// ─── Server cart totals ───────────────────────────────────────────────────────
const serverTotals = (cart: IServerCart): ICartTotals => {
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0)
  const afterDiscount = Math.max(0, cart.cartTotal - cart.discountAmount)
  const isFreeShipping = afterDiscount >= FREE_SHIPPING_THRESHOLD_CLIENT
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CLIENT - afterDiscount)
  return {
    subtotal: cart.cartTotal,
    discountAmount: cart.discountAmount,
    shippingCost: cart.shippingCost,
    taxAmount: cart.taxAmount,
    grandTotal: cart.grandTotal,
    totalItems,
    isFreeShipping,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD_CLIENT,
    remainingForFreeShipping: remaining,
  }
}

// ─── Unified hook for components ──────────────────────────────────────────────
export const useCart = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const {
    guestItems,
    serverCart,
    addGuestItem,
    removeGuestItem,
    updateGuestQty,
    clearGuestCart,
    guestTotals,
  } = useCartStore()

  const { isLoading, isFetching, isError: cartFetchError } = useServerCart()
  const addMutation = useAddToCartMutation()
  const updateMutation = useUpdateCartItemMutation()
  const removeMutation = useRemoveFromCartMutation()
  const clearMutation = useClearCartMutation()

  // ── Unified display items ──────────────────────────────
  const displayItems: ICartDisplayItem[] =
    isAuthenticated && serverCart
      ? serverCart.items
          .filter((i) => typeof i.productId === 'object')
          .map((i) => {
            const product = i.productId as IProduct
            return {
              productId: product._id,
              product,
              quantity: i.quantity,
              itemPrice: i.itemPrice,
              lineTotal: Math.round(i.itemPrice * i.quantity * 100) / 100,
              selectedVariant: i.selectedVariant,
              selectedSize: i.selectedSize,
              selectedColor: i.selectedColor,
            }
          })
      : guestItems.map((i) => {
          const effectivePrice =
            i.product.discountPrice && i.product.discountPrice < i.product.price
              ? i.product.discountPrice
              : i.product.price
          return {
            productId: i.product._id,
            product: i.product,
            quantity: i.quantity,
            itemPrice: effectivePrice,
            lineTotal: Math.round(effectivePrice * i.quantity * 100) / 100,
            selectedVariant: i.selectedVariant,
            selectedSize: i.selectedSize,
            selectedColor: i.selectedColor,
          }
        })

  // ── Unified totals ─────────────────────────────────────
  const totals: ICartTotals =
    isAuthenticated && serverCart ? serverTotals(serverCart) : guestTotals()

  // ── Unified add to cart ────────────────────────────────
  const addToCart = (
    product: IProduct,
    quantity = 1,
    opts?: { selectedVariant?: string; selectedSize?: string; selectedColor?: string },
  ) => {
    if (isAuthenticated) {
      addMutation.mutate({ productId: product._id, quantity, ...opts })
    } else {
      addGuestItem(product, quantity, opts)
    }
  }

  const removeFromCart = (productId: string) => {
    if (isAuthenticated) {
      removeMutation.mutate(productId)
    } else {
      removeGuestItem(productId)
    }
  }

  const updateQuantity = (productId: string, qty: number) => {
    if (isAuthenticated) {
      updateMutation.mutate({ productId, qty })
    } else {
      updateGuestQty(productId, qty)
    }
  }

  const clearCart = () => {
    if (isAuthenticated) {
      clearMutation.mutate()
    } else {
      clearGuestCart()
    }
  }

  const isMutating =
    addMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    clearMutation.isPending

  return {
    items: displayItems,
    totals,
    isLoading: isAuthenticated ? isLoading : false,
    isFetching: isAuthenticated ? isFetching : false,
    isFetchError: isAuthenticated ? cartFetchError : false,
    isMutating,
    isGuest: !isAuthenticated,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    // raw
    serverCart,
    guestItems,
  }
}
