import { useState } from 'react'
import { FiRefreshCw, FiAlertCircle, FiBookmark, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import { useCart } from '../../hooks/useCart.js'
import { useAuthStore } from '../../store/authStore.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import CartList from '../../components/cart/CartList/index.js'
import CartSummary from '../../components/cart/CartSummary/index.js'
import EmptyCart from '../../components/cart/EmptyCart/index.js'
import RecommendedProducts from '../../components/cart/RecommendedProducts/index.js'
import { dashboardService } from '../../services/dashboardService.js'
import { getImageUrl } from '../../utils/image.js'
import type { IProduct } from '../../../shared/types/product.types.js'

interface CouponState {
  code: string | undefined
  discount: number
  error: string | undefined
  loading: boolean
}

function SaveForLaterSection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()
  const { data: saved = [], isLoading } = useQuery({
    queryKey: ['cart', 'saveForLater'],
    queryFn: () => dashboardService.getSavedItems(),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated || (!isLoading && saved.length === 0)) return null

  const restore = async (productId: string) => {
    await dashboardService.restoreSavedItem(productId)
    void qc.invalidateQueries({ queryKey: ['cart', 'saveForLater'] })
    void qc.invalidateQueries({ queryKey: ['cart'] })
  }

  const remove = async (productId: string) => {
    await dashboardService.removeSavedItem(productId)
    void qc.invalidateQueries({ queryKey: ['cart', 'saveForLater'] })
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: '1rem',
          fontWeight: 700,
          fontSize: 'var(--text-base)',
        }}
      >
        <FiBookmark size={16} />
        Saved for Later ({saved.length})
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {(saved as IProduct[]).map((p) => (
          <div
            key={p._id}
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-neutral-200)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            {getImageUrl(p.images[0]) && (
              <img
                src={getImageUrl(p.images[0])}
                alt={p.title}
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                }}
              />
            )}
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.3 }}>
              {p.title}
            </div>
            <div
              style={{
                fontWeight: 700,
                color: 'var(--color-brand-accent)',
                fontSize: 'var(--text-sm)',
              }}
            >
              ${(p.discountPrice ?? p.price).toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => restore(p._id)}
                style={{
                  flex: 1,
                  background: 'var(--color-brand-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 0',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <FiShoppingCart size={12} /> Add to Cart
              </button>
              <button
                onClick={() => remove(p._id)}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-400)',
                }}
              >
                <FiTrash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CartPage() {
  const {
    items,
    totals,
    isLoading,
    isFetching,
    isFetchError,
    isMutating,
    isGuest,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart()

  const [coupon, setCoupon] = useState<CouponState>({
    code: undefined,
    discount: 0,
    error: undefined,
    loading: false,
  })

  const handleCouponApply = (code: string) => {
    setCoupon({
      code: undefined,
      discount: 0,
      error: 'Invalid or expired coupon code',
      loading: false,
    })
    void code
  }

  const handleCouponRemove = () => {
    setCoupon({ code: undefined, discount: 0, error: undefined, loading: false })
  }

  if (isLoading) {
    return (
      <div className="cart-page container section">
        <div className="cart-page__skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton cart-item-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  // Show a friendly error if the fetch failed AND there's no cached cart to display
  if (isFetchError && items.length === 0 && !isGuest) {
    return (
      <div
        className="cart-page container section"
        style={{ textAlign: 'center', paddingTop: 'var(--space-16)' }}
      >
        <FiAlertCircle
          size={48}
          color="var(--color-danger)"
          style={{ marginBottom: 'var(--space-4)' }}
        />
        <h2 style={{ marginBottom: 'var(--space-2)' }}>Could not load your cart</h2>
        <p style={{ color: 'var(--color-neutral-500)', marginBottom: 'var(--space-6)' }}>
          There was a problem reaching the server. Please try again.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="container section">
        <div className="cart-page__header">
          <h1 className="cart-page__title">Shopping Cart</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {items.length > 0 && (
              <span className="cart-page__count">
                {totals.totalItems} item{totals.totalItems !== 1 ? 's' : ''}
              </span>
            )}
            {isFetching && !isMutating && (
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-400)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <FiRefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                Syncing…
              </span>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="cart-page__layout">
            <div className="cart-page__main">
              <CartList
                items={items}
                onRemove={removeFromCart}
                onUpdateQty={updateQuantity}
                isMutating={isMutating}
              />
            </div>
            <div className="cart-page__aside">
              <CartSummary
                totals={totals}
                onCouponApply={handleCouponApply}
                onCouponRemove={handleCouponRemove}
                appliedCoupon={coupon.code}
                couponLoading={coupon.loading}
                couponError={coupon.error}
                onClearCart={clearCart}
                isCheckoutEnabled={items.length > 0}
              />
            </div>
          </div>
        )}

        <SaveForLaterSection />
        <RecommendedProducts />
      </div>
    </div>
  )
}
