import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '../../store/cartStore.js'
import type { IProduct } from '../../../shared/types/product.types.js'
import { PRODUCT_CATEGORIES } from '../../../shared/constants/index.js'
import {
  FREE_SHIPPING_THRESHOLD_CLIENT,
  FLAT_SHIPPING_COST_CLIENT,
} from '../../config/cart.constants.js'

function makeProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    _id: 'product-1',
    title: 'Test Product',
    description: 'A test product',
    price: 20.0,
    images: [],
    category: PRODUCT_CATEGORIES[0],
    stockQuantity: 50,
    sku: 'TEST-001',
    ratingsAverage: 0,
    ratingsCount: 0,
    sellerId: 'seller-1',
    tags: [],
    isActive: true,
    status: 'active',
    isFeatured: false,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  useCartStore.setState({ guestItems: [], serverCart: null })
})

describe('cartStore — addGuestItem', () => {
  it('adds a new product to the cart', () => {
    useCartStore.getState().addGuestItem(makeProduct(), 1)
    expect(useCartStore.getState().guestItems).toHaveLength(1)
  })

  it('sets the correct quantity', () => {
    useCartStore.getState().addGuestItem(makeProduct(), 3)
    expect(useCartStore.getState().guestItems[0].quantity).toBe(3)
  })

  it('defaults quantity to 1 when not specified', () => {
    useCartStore.getState().addGuestItem(makeProduct())
    expect(useCartStore.getState().guestItems[0].quantity).toBe(1)
  })

  it('increments quantity when same product is added again', () => {
    const product = makeProduct()
    useCartStore.getState().addGuestItem(product, 2)
    useCartStore.getState().addGuestItem(product, 3)
    expect(useCartStore.getState().guestItems).toHaveLength(1)
    expect(useCartStore.getState().guestItems[0].quantity).toBe(5)
  })

  it('caps quantity at stockQuantity', () => {
    const product = makeProduct({ stockQuantity: 5 })
    useCartStore.getState().addGuestItem(product, 10)
    expect(useCartStore.getState().guestItems[0].quantity).toBe(5)
  })

  it('does not exceed stockQuantity when incrementing', () => {
    const product = makeProduct({ stockQuantity: 3 })
    useCartStore.getState().addGuestItem(product, 2)
    useCartStore.getState().addGuestItem(product, 5)
    expect(useCartStore.getState().guestItems[0].quantity).toBe(3)
  })

  it('treats products with different ids as separate items', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }))
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p2' }))
    expect(useCartStore.getState().guestItems).toHaveLength(2)
  })
})

describe('cartStore — removeGuestItem', () => {
  it('removes the product from the cart', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'prod-to-remove' }))
    useCartStore.getState().removeGuestItem('prod-to-remove')
    expect(useCartStore.getState().guestItems).toHaveLength(0)
  })

  it('only removes the targeted product', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }))
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p2' }))
    useCartStore.getState().removeGuestItem('p1')
    expect(useCartStore.getState().guestItems).toHaveLength(1)
    expect(useCartStore.getState().guestItems[0].product._id).toBe('p2')
  })
})

describe('cartStore — updateGuestQty', () => {
  it('updates quantity for an existing item', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }), 1)
    useCartStore.getState().updateGuestQty('p1', 4)
    expect(useCartStore.getState().guestItems[0].quantity).toBe(4)
  })

  it('removes item when quantity is set to 0', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }), 2)
    useCartStore.getState().updateGuestQty('p1', 0)
    expect(useCartStore.getState().guestItems).toHaveLength(0)
  })

  it('removes item when quantity is negative', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }), 2)
    useCartStore.getState().updateGuestQty('p1', -1)
    expect(useCartStore.getState().guestItems).toHaveLength(0)
  })

  it('caps quantity at stockQuantity', () => {
    const product = makeProduct({ _id: 'p1', stockQuantity: 3 })
    useCartStore.getState().addGuestItem(product, 1)
    useCartStore.getState().updateGuestQty('p1', 10)
    expect(useCartStore.getState().guestItems[0].quantity).toBe(3)
  })
})

describe('cartStore — clearGuestCart', () => {
  it('empties the cart', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }))
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p2' }))
    useCartStore.getState().clearGuestCart()
    expect(useCartStore.getState().guestItems).toHaveLength(0)
  })
})

describe('cartStore — totalItems', () => {
  it('returns 0 for empty cart', () => {
    expect(useCartStore.getState().totalItems()).toBe(0)
  })

  it('returns sum of all item quantities from guest cart', () => {
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p1' }), 2)
    useCartStore.getState().addGuestItem(makeProduct({ _id: 'p2' }), 3)
    expect(useCartStore.getState().totalItems()).toBe(5)
  })
})

describe('cartStore — guestTotals', () => {
  it('returns zero totals for empty cart', () => {
    const totals = useCartStore.getState().guestTotals()
    expect(totals.subtotal).toBe(0)
    expect(totals.grandTotal).toBe(0)
    expect(totals.shippingCost).toBe(0)
  })

  it('calculates subtotal from item price × quantity', () => {
    useCartStore.getState().addGuestItem(makeProduct({ price: 25 }), 2)
    expect(useCartStore.getState().guestTotals().subtotal).toBe(50)
  })

  it('uses discountPrice when it is lower than price', () => {
    useCartStore.getState().addGuestItem(makeProduct({ price: 100, discountPrice: 60 }), 1)
    expect(useCartStore.getState().guestTotals().subtotal).toBe(60)
  })

  it('ignores discountPrice when it is higher than price', () => {
    useCartStore.getState().addGuestItem(makeProduct({ price: 50, discountPrice: 80 }), 1)
    expect(useCartStore.getState().guestTotals().subtotal).toBe(50)
  })

  it('charges flat shipping when below FREE_SHIPPING_THRESHOLD_CLIENT', () => {
    useCartStore.getState().addGuestItem(makeProduct({ price: 10 }), 1)
    expect(useCartStore.getState().guestTotals().shippingCost).toBe(FLAT_SHIPPING_COST_CLIENT)
  })

  it('grants free shipping when at or above FREE_SHIPPING_THRESHOLD_CLIENT', () => {
    useCartStore.getState().addGuestItem(makeProduct({ price: FREE_SHIPPING_THRESHOLD_CLIENT }), 1)
    const totals = useCartStore.getState().guestTotals()
    expect(totals.isFreeShipping).toBe(true)
    expect(totals.shippingCost).toBe(0)
  })

  it('calculates flat tax fee at FLAT_TAX_FEE_CLIENT for cart items', () => {
    useCartStore.getState().addGuestItem(makeProduct({ price: 100 }), 1)
    const { taxAmount } = useCartStore.getState().guestTotals()
    expect(taxAmount).toBe(0.022)
  })

  it('calculates grandTotal as subtotal + shipping + tax', () => {
    const price = 30
    useCartStore.getState().addGuestItem(makeProduct({ price }), 1)
    const { subtotal, shippingCost, taxAmount, grandTotal } = useCartStore.getState().guestTotals()
    expect(grandTotal).toBeCloseTo(subtotal + shippingCost + taxAmount, 2)
  })
})
