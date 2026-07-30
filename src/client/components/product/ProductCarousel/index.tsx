import { useState, useRef } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import ProductCard from '../ProductCard/index.js'
import type { IProduct } from '../../../../shared/types/product.types.js'

interface ProductCarouselProps {
  products: IProduct[]
  onQuickView?: (product: IProduct) => void
  itemsVisible?: number
}

export default function ProductCarousel({
  products,
  onQuickView,
  itemsVisible = 4,
}: ProductCarouselProps) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, products.length - itemsVisible)
  const canPrev = index > 0
  const canNext = index < maxIndex

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1))

  const gap = 20
  const pct = 100 / itemsVisible
  const offset = index * (pct + gap / itemsVisible)

  if (products.length === 0) return null

  return (
    <div className="product-carousel">
      <button
        className="product-carousel__btn product-carousel__btn--prev"
        onClick={prev}
        disabled={!canPrev}
        aria-label="Previous products"
      >
        <FiChevronLeft size={18} />
      </button>

      <div style={{ overflow: 'hidden', margin: '0 12px' }}>
        <div
          ref={trackRef}
          className="product-carousel__track"
          style={{ transform: `translateX(calc(-${offset}% - ${index * gap}px))` }}
        >
          {products.map((product) => (
            <div key={product._id} className="product-carousel__item">
              <ProductCard product={product} onQuickView={onQuickView} />
            </div>
          ))}
        </div>
      </div>

      <button
        className="product-carousel__btn product-carousel__btn--next"
        onClick={next}
        disabled={!canNext}
        aria-label="Next products"
      >
        <FiChevronRight size={18} />
      </button>
    </div>
  )
}
