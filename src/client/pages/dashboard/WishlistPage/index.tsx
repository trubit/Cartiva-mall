import { Link } from 'react-router-dom'
import { FiHeart, FiTrash2, FiShoppingCart } from 'react-icons/fi'
import { useWishlist, useRemoveFromWishlist } from '../../../hooks/useDashboard.js'
import { useCartStore } from '../../../store/cartStore.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'
import type { IProduct } from '../../../../shared/types/product.types.js'

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function WishlistPage() {
  const { data, isLoading } = useWishlist()
  const removeFromWishlist = useRemoveFromWishlist()
  const addGuestItem = useCartStore((s) => s.addGuestItem)

  if (isLoading) return <LoadingSpinner />

  const items = data?.items ?? []

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">
          <FiHeart style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Wishlist
        </h1>
        <p className="dashboard-page-subtitle">
          {items.length} saved {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="dashboard-section">
          <div className="dashboard-empty">
            <FiHeart className="dashboard-empty__icon" />
            <p className="dashboard-empty__title">Your wishlist is empty</p>
            <p className="dashboard-empty__text">
              Save products you love to your wishlist and come back to them later.
            </p>
            <Link to="/products" className="dashboard-btn dashboard-btn--primary">
              Discover Products
            </Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-wishlist-grid">
          {items.map((item) => {
            const product = item.productId as IProduct
            if (!product?._id) return null

            const hasDiscount = product.discountPrice && product.discountPrice < product.price

            return (
              <div className="dashboard-wishlist-card" key={item._id}>
                <Link to={`/products/${product._id}`}>
                  <img
                    src={product.images?.[0] ?? '/placeholder.png'}
                    alt={product.title}
                    className="dashboard-wishlist-card__img"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/placeholder.png'
                    }}
                  />
                </Link>

                <button
                  className="dashboard-wishlist-card__remove"
                  aria-label="Remove from wishlist"
                  onClick={() => removeFromWishlist.mutate(product._id)}
                  disabled={removeFromWishlist.isPending}
                >
                  <FiTrash2 />
                </button>

                <div className="dashboard-wishlist-card__body">
                  <Link to={`/products/${product._id}`} style={{ textDecoration: 'none' }}>
                    <p className="dashboard-wishlist-card__name">{product.title}</p>
                  </Link>

                  <p className="dashboard-wishlist-card__price">
                    {hasDiscount ? (
                      <>
                        <span className="dashboard-wishlist-card__price-sale">
                          {formatCurrency(product.discountPrice!)}
                        </span>{' '}
                        <span
                          style={{
                            textDecoration: 'line-through',
                            color: 'var(--color-neutral-400)',
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          {formatCurrency(product.price)}
                        </span>
                      </>
                    ) : (
                      formatCurrency(product.price)
                    )}
                  </p>

                  <button
                    className="dashboard-btn dashboard-btn--primary"
                    style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                    onClick={() => addGuestItem(product)}
                    disabled={product.stockQuantity === 0}
                  >
                    <FiShoppingCart />
                    {product.stockQuantity === 0 ? 'Out of stock' : 'Add to cart'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
