import { Link } from 'react-router-dom'
import { FiEye } from 'react-icons/fi'
import { useRecentlyViewed } from '../../../hooks/useDashboard.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function RecentlyViewedPage() {
  const { data: products, isLoading } = useRecentlyViewed()

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">
          <FiEye style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Recently Viewed
        </h1>
        <p className="dashboard-page-subtitle">
          {products?.length ?? 0} products you've viewed recently
        </p>
      </div>

      {!products || products.length === 0 ? (
        <div className="dashboard-section">
          <div className="dashboard-empty">
            <FiEye className="dashboard-empty__icon" />
            <p className="dashboard-empty__title">Nothing here yet</p>
            <p className="dashboard-empty__text">
              Products you browse will appear here for quick access.
            </p>
            <Link to="/products" className="dashboard-btn dashboard-btn--primary">
              Browse Products
            </Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-wishlist-grid">
          {products.filter(Boolean).map((product) => {
            if (!product) return null
            const hasDiscount = product.discountPrice && product.discountPrice < product.price
            return (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="dashboard-wishlist-card">
                  <img
                    src={product.images?.[0] ?? '/placeholder.png'}
                    alt={product.title}
                    className="dashboard-wishlist-card__img"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/placeholder.png'
                    }}
                  />
                  <div className="dashboard-wishlist-card__body">
                    <p className="dashboard-wishlist-card__name">{product.title}</p>
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
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
