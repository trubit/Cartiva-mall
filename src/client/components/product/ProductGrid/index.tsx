import ProductCard from '../ProductCard/index.js'
import { useProductStore } from '../../../store/productStore.js'
import type { IProduct } from '../../../../shared/types/product.types.js'

interface ProductGridProps {
  products: IProduct[]
  cols?: 2 | 3 | 4 | 5
  onQuickView?: (product: IProduct) => void
}

function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <div className="products-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-img" />
          <div className="skeleton-line" style={{ width: '50%' }} />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--med" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  )
}

interface ProductGridWithStateProps extends ProductGridProps {
  isLoading?: boolean
  isEmpty?: boolean
}

export default function ProductGrid({
  products,
  cols = 4,
  onQuickView,
  isLoading = false,
  isEmpty = false,
}: ProductGridWithStateProps) {
  const setSelectedProduct = useProductStore((s) => s.setSelectedProduct)

  const handleQuickView = (product: IProduct) => {
    setSelectedProduct(product)
    onQuickView?.(product)
  }

  if (isLoading) return <SkeletonCards count={8} />

  if (isEmpty || products.length === 0) {
    return (
      <div className="products-empty">
        <div className="products-empty__icon">🛍️</div>
        <p className="products-empty__title">No products found</p>
        <p style={{ fontSize: 'var(--text-sm)' }}>Try adjusting your filters or search term.</p>
      </div>
    )
  }

  return (
    <div className={`product-grid product-grid--${cols}col`}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} onQuickView={handleQuickView} />
      ))}
    </div>
  )
}
