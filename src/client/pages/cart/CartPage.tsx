import { useState } from 'react'
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import { useCart } from '../../hooks/useCart.js'
import CartList from '../../components/cart/CartList/index.js'
import CartSummary from '../../components/cart/CartSummary/index.js'
import EmptyCart from '../../components/cart/EmptyCart/index.js'
import RecommendedProducts from '../../components/cart/RecommendedProducts/index.js'

interface CouponState {
  code: string | undefined
  discount: number
  error: string | undefined
  loading: boolean
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

        <RecommendedProducts />
      </div>
    </div>
  )
}
