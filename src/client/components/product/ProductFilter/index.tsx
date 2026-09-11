import { useState } from 'react'
import { FiSliders } from 'react-icons/fi'
import RatingStars from '../RatingStars/index.js'
import { PRODUCT_CATEGORIES } from '../../../../shared/constants/index.js'
import { useProductStore } from '../../../store/productStore.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type { ProductFilters } from '../../../../shared/types/product.types.js'

const SORT_OPTIONS: { value: ProductFilters['sort']; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
]

interface ProductFilterProps {
  onChange?: (filters: Partial<ProductFilters>) => void
}

export default function ProductFilter({ onChange }: ProductFilterProps) {
  const { filters, setFilters, resetFilters } = useProductStore()
  const { symbol: currencySymbol } = useCurrency()
  const [localMin, setLocalMin] = useState(filters.minPrice?.toString() ?? '')
  const [localMax, setLocalMax] = useState(filters.maxPrice?.toString() ?? '')

  const update = (partial: Partial<ProductFilters>) => {
    setFilters(partial)
    onChange?.(partial)
  }

  const applyPrice = () => {
    update({
      minPrice: localMin ? parseFloat(localMin) : undefined,
      maxPrice: localMax ? parseFloat(localMax) : undefined,
    })
  }

  const handleReset = () => {
    setLocalMin('')
    setLocalMax('')
    resetFilters()
    onChange?.({})
  }

  return (
    <aside className="product-filter">
      <div className="product-filter__title">
        <span>
          <FiSliders size={16} style={{ marginRight: 6 }} />
          Filters
        </span>
        <button
          onClick={handleReset}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-brand-accent)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Reset all
        </button>
      </div>

      {/* Sort */}
      <div className="product-filter__section">
        <div className="product-filter__section-title">Sort By</div>
        {SORT_OPTIONS.map(({ value, label }) => (
          <label key={value} className="product-filter__option">
            <input
              type="radio"
              name="sort"
              value={value}
              checked={filters.sort === value}
              onChange={() => update({ sort: value })}
            />
            {label}
          </label>
        ))}
      </div>

      {/* Category */}
      <div className="product-filter__section">
        <div className="product-filter__section-title">Category</div>
        <label className="product-filter__option">
          <input
            type="radio"
            name="category"
            value=""
            checked={!filters.category}
            onChange={() => update({ category: undefined })}
          />
          All Categories
        </label>
        {PRODUCT_CATEGORIES.map((cat) => (
          <label key={cat} className="product-filter__option">
            <input
              type="radio"
              name="category"
              value={cat}
              checked={filters.category === cat}
              onChange={() => update({ category: cat })}
            />
            {cat}
          </label>
        ))}
      </div>

      {/* Price Range */}
      <div className="product-filter__section">
        <div className="product-filter__section-title">Price Range</div>
        <div className="product-filter__price-inputs">
          <input
            type="number"
            className="product-filter__price-input"
            placeholder={`Min ${currencySymbol}`}
            value={localMin}
            min={0}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={applyPrice}
          />
          <span style={{ color: 'var(--color-neutral-400)' }}>–</span>
          <input
            type="number"
            className="product-filter__price-input"
            placeholder={`Max ${currencySymbol}`}
            value={localMax}
            min={0}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={applyPrice}
          />
        </div>
      </div>

      {/* Rating */}
      <div className="product-filter__section">
        <div className="product-filter__section-title">Minimum Rating</div>
        {[4, 3, 2, 1].map((r) => (
          <label key={r} className="product-filter__option">
            <input
              type="radio"
              name="rating"
              value={r}
              checked={filters.rating === r}
              onChange={() => update({ rating: r })}
            />
            <RatingStars value={r} size="sm" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
              & up
            </span>
          </label>
        ))}
        {filters.rating && (
          <button
            onClick={() => update({ rating: undefined })}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-neutral-500)',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            Clear rating filter
          </button>
        )}
      </div>

      {/* Stock */}
      <div className="product-filter__section">
        <div className="product-filter__section-title">Availability</div>
        <label className="product-filter__option">
          <input
            type="checkbox"
            checked={filters.inStock ?? false}
            onChange={(e) => update({ inStock: e.target.checked || undefined })}
          />
          In Stock Only
        </label>
      </div>
    </aside>
  )
}
