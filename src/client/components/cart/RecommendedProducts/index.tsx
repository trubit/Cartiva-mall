import { Link } from 'react-router-dom'
import { useFeaturedProducts } from '../../../hooks/useProducts.js'
import ProductCard from '../../product/ProductCard/index.js'

export default function RecommendedProducts() {
  const { data, isLoading } = useFeaturedProducts(4)

  if (isLoading) {
    return (
      <section className="recommended-products">
        <h3 className="recommended-products__title">You Might Also Like</h3>
        <div className="recommended-products__grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton product-card-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  const products = data ?? []
  if (products.length === 0) return null

  return (
    <section className="recommended-products">
      <div className="recommended-products__hd">
        <h3 className="recommended-products__title">You Might Also Like</h3>
        <Link to="/products" className="btn btn-ghost btn-sm">
          View all
        </Link>
      </div>

      <div className="recommended-products__grid">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  )
}
