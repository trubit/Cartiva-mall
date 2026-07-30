import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductCard from '../../components/product/ProductCard/index.js'
import type { IProduct } from '../../../shared/types/product.types.js'
import { PRODUCT_CATEGORIES } from '../../../shared/constants/index.js'

const mockAddToCart = vi.fn()

vi.mock('../../hooks/useCart.js', () => ({
  useCart: () => ({ addToCart: mockAddToCart }),
}))

function makeProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    _id: 'prod-001',
    title: 'Wireless Noise-Cancelling Headphones',
    description: 'Premium audio experience',
    price: 149.99,
    images: ['https://example.com/headphones.jpg'],
    category: PRODUCT_CATEGORIES[0],
    stockQuantity: 10,
    sku: 'WNC-001',
    ratingsAverage: 4.5,
    ratingsCount: 230,
    sellerId: 'seller-1',
    tags: ['audio', 'wireless'],
    isActive: true,
    status: 'active',
    isFeatured: false,
    views: 0,
    brand: 'SoundPro',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function renderCard(product: IProduct, onQuickView?: (p: IProduct) => void) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} onQuickView={onQuickView} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockAddToCart.mockClear()
})

describe('ProductCard — rendering', () => {
  it('renders the product title', () => {
    renderCard(makeProduct())
    expect(screen.getByText('Wireless Noise-Cancelling Headphones')).toBeInTheDocument()
  })

  it('renders the product category', () => {
    renderCard(makeProduct())
    expect(screen.getByText(PRODUCT_CATEGORIES[0])).toBeInTheDocument()
  })

  it('renders the product brand', () => {
    renderCard(makeProduct())
    expect(screen.getByText('SoundPro')).toBeInTheDocument()
  })

  it('renders the product image with correct alt text', () => {
    renderCard(makeProduct())
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Wireless Noise-Cancelling Headphones')
    expect(img).toHaveAttribute('src', 'https://example.com/headphones.jpg')
  })

  it('renders a placeholder when product has no images', () => {
    renderCard(makeProduct({ images: [] }))
    expect(document.querySelector('.product-card__img--placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders rating stars when ratingsCount > 0', () => {
    renderCard(makeProduct({ ratingsAverage: 4.5, ratingsCount: 100 }))
    expect(document.querySelector('.rating-stars')).toBeInTheDocument()
  })

  it('hides rating stars when ratingsCount is 0', () => {
    renderCard(makeProduct({ ratingsAverage: 0, ratingsCount: 0 }))
    expect(document.querySelector('.rating-stars')).not.toBeInTheDocument()
  })

  it('hides brand separator when brand is not provided', () => {
    const { container } = renderCard(makeProduct({ brand: undefined }))
    expect(container.querySelector('.product-card__meta-sep')).not.toBeInTheDocument()
  })
})

describe('ProductCard — Add to Cart button', () => {
  it('shows "Add to Cart" label when in stock', () => {
    renderCard(makeProduct({ stockQuantity: 5 }))
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })

  it('enables the button when in stock', () => {
    renderCard(makeProduct({ stockQuantity: 1 }))
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled()
  })

  it('shows "Out of Stock" label when stockQuantity is 0', () => {
    renderCard(makeProduct({ stockQuantity: 0 }))
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeInTheDocument()
  })

  it('disables button when out of stock', () => {
    renderCard(makeProduct({ stockQuantity: 0 }))
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled()
  })

  it('calls addToCart with the product and quantity 1 when clicked', () => {
    const product = makeProduct()
    renderCard(product)
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(mockAddToCart).toHaveBeenCalledOnce()
    expect(mockAddToCart).toHaveBeenCalledWith(product, 1)
  })

  it('does not call addToCart when out of stock button is clicked', () => {
    renderCard(makeProduct({ stockQuantity: 0 }))
    fireEvent.click(screen.getByRole('button', { name: /out of stock/i }))
    expect(mockAddToCart).not.toHaveBeenCalled()
  })
})

describe('ProductCard — Quick View', () => {
  it('calls onQuickView with the product when Quick View is clicked', () => {
    const onQuickView = vi.fn()
    const product = makeProduct()
    renderCard(product, onQuickView)
    fireEvent.click(screen.getByRole('button', { name: /quick view/i }))
    expect(onQuickView).toHaveBeenCalledOnce()
    expect(onQuickView).toHaveBeenCalledWith(product)
  })

  it('does not throw when onQuickView is not provided', () => {
    renderCard(makeProduct())
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /quick view/i }))
    }).not.toThrow()
  })
})
