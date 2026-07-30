import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { useSearchProducts } from '../../hooks/useProducts.js'
import { useProductStore } from '../../store/productStore.js'
import ProductGrid from '../../components/product/ProductGrid/index.js'
import ProductSearch from '../../components/product/ProductSearch/index.js'
import QuickViewModal from '../../components/product/QuickViewModal/index.js'
import type { IProduct } from '../../../shared/types/product.types.js'

export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const { filters } = useProductStore()
  const { data, isLoading } = useSearchProducts(q, {
    ...filters,
    page: Number(params.get('page')) || 1,
  })
  const [quickView, setQuickView] = useState<IProduct | null>(null)

  const products = data?.data ?? []
  const pagination = data?.pagination

  const handlePage = (page: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(page))
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearch = (newQ: string) => {
    setParams({ q: newQ, page: '1' })
  }

  return (
    <div className="container section">
      <div style={{ maxWidth: 600, margin: '0 auto 2rem' }}>
        <ProductSearch defaultValue={q} onSearch={handleSearch} />
      </div>

      {q ? (
        <>
          <div
            style={{
              marginBottom: '1.5rem',
              color: 'var(--color-neutral-600)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {isLoading ? (
              'Searching…'
            ) : (
              <>
                {pagination?.total ?? 0} result{(pagination?.total ?? 0) !== 1 ? 's' : ''} for{' '}
                <strong>"{q}"</strong>
              </>
            )}
          </div>

          <ProductGrid
            products={products}
            cols={4}
            isLoading={isLoading}
            isEmpty={!isLoading && products.length === 0}
            onQuickView={setQuickView}
          />

          {(pagination?.totalPages ?? 0) > 1 && (
            <nav className="pagination">
              <button
                className="pagination__btn"
                onClick={() => handlePage((pagination?.page ?? 1) - 1)}
                disabled={!pagination?.hasPrev}
              >
                ‹
              </button>
              {Array.from({ length: pagination?.totalPages ?? 0 }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`pagination__btn${p === pagination?.page ? ' pagination__btn--active' : ''}`}
                  onClick={() => handlePage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="pagination__btn"
                onClick={() => handlePage((pagination?.page ?? 1) + 1)}
                disabled={!pagination?.hasNext}
              >
                ›
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="products-empty">
          <div className="products-empty__icon">
            <FiSearch size={48} />
          </div>
          <p className="products-empty__title">What are you looking for?</p>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            Type a product name, brand, or category above.
          </p>
        </div>
      )}

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
