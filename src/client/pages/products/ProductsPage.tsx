import { useState } from 'react'
import { FiFilter } from 'react-icons/fi'
import { useProducts } from '../../hooks/useProducts.js'
import { useProductStore } from '../../store/productStore.js'
import ProductGrid from '../../components/product/ProductGrid/index.js'
import ProductFilter from '../../components/product/ProductFilter/index.js'
import ProductSearch from '../../components/product/ProductSearch/index.js'
import QuickViewModal from '../../components/product/QuickViewModal/index.js'
import type { IProduct } from '../../../shared/types/product.types.js'

const SORT_LABELS: Record<string, string> = {
  newest: 'Newest First',
  price_asc: 'Price: Low → High',
  price_desc: 'Price: High → Low',
  rating: 'Top Rated',
  popular: 'Most Popular',
}

export default function ProductsPage() {
  const { filters, setFilters } = useProductStore()
  const { data, isLoading } = useProducts(filters)
  const [quickView, setQuickView] = useState<IProduct | null>(null)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  const products = data?.data ?? []
  const pagination = data?.pagination

  const handlePage = (page: number) => {
    setFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = pagination?.totalPages ?? 1
  const currentPage = filters.page ?? 1

  return (
    <div className="container section">
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <ProductSearch
            defaultValue={filters.search ?? ''}
            onSearch={(q) => setFilters({ search: q || undefined })}
          />
        </div>

        <button className="btn btn-outline hide-desktop" onClick={() => setShowMobileFilter(true)}>
          <FiFilter size={15} /> Filters
        </button>
      </div>

      <div className="products-layout">
        {/* Sidebar filter (desktop) */}
        <div className="hide-mobile">
          <ProductFilter />
        </div>

        {/* Products */}
        <div>
          <div className="products-main__header">
            <span className="products-main__count">
              {isLoading
                ? 'Loading…'
                : `${pagination?.total ?? 0} product${(pagination?.total ?? 0) !== 1 ? 's' : ''}`}
            </span>

            <div className="products-main__sort">
              <span style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
                Sort:
              </span>
              <select
                value={filters.sort ?? 'newest'}
                onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}
              >
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ProductGrid
            products={products}
            cols={3}
            isLoading={isLoading}
            isEmpty={!isLoading && products.length === 0}
            onQuickView={setQuickView}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination" aria-label="Products pagination">
              <button
                className="pagination__btn"
                onClick={() => handlePage(currentPage - 1)}
                disabled={!pagination?.hasPrev}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span
                      key={`e${i}`}
                      style={{ padding: '0 4px', color: 'var(--color-neutral-400)' }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`pagination__btn${p === currentPage ? ' pagination__btn--active' : ''}`}
                      onClick={() => handlePage(p as number)}
                    >
                      {p}
                    </button>
                  ),
                )}

              <button
                className="pagination__btn"
                onClick={() => handlePage(currentPage + 1)}
                disabled={!pagination?.hasNext}
              >
                ›
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {showMobileFilter && (
        <div className="filter-sheet">
          <div className="filter-sheet__backdrop" onClick={() => setShowMobileFilter(false)} />
          <div className="filter-sheet__panel">
            <div className="filter-sheet__handle" />
            <ProductFilter onChange={() => setShowMobileFilter(false)} />
          </div>
        </div>
      )}

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
