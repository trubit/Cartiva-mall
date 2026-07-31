import { useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { useRelatedProducts } from '../../../hooks/useProducts.js'
import ProductCarousel from '../ProductCarousel/index.js'
import QuickViewModal from '../QuickViewModal/index.js'
import type { IProduct } from '../../../../shared/types/product.types.js'

interface RelatedProductsProps {
  productId: string
  category?: string
}

export default function RelatedProducts({ productId }: RelatedProductsProps) {
  const { data: products = [], isLoading } = useRelatedProducts(productId, 12)
  const [quickView, setQuickView] = useState<IProduct | null>(null)

  if (!isLoading && products.length === 0) return null

  return (
    <section className="section section--sm">
      <div className="container">
        <div className="section-hd">
          <div>
            <div className="section-hd__label">You May Also Like</div>
            <h2 className="section-hd__title">Related Products</h2>
          </div>
          <a href={`/products?category=${encodeURIComponent('')}`} className="section-hd__link">
            View more <FiArrowRight size={13} />
          </a>
        </div>

        {isLoading ? (
          <div className="products-skeleton" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-img" />
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-line skeleton-line--med" />
              </div>
            ))}
          </div>
        ) : (
          <ProductCarousel products={products} onQuickView={setQuickView} />
        )}
      </div>

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  )
}
