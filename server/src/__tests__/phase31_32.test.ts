import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  createProduct,
  updateProduct,
  setProductStatus,
  createCategory,
  getCategories,
  createBrand,
  getBrands,
  createProductVariant,
  getProductVariants,
} from '../modules/product/product.service.js'
import {
  getCart,
  addToCart,
  updateCartItem,
  clearCart,
  mergeCart,
} from '../modules/cart/cart.service.js'
import { Cart } from '../modules/cart/cart.model.js'

let mongoServer: MongoMemoryServer
const sellerAId = new mongoose.Types.ObjectId().toString()
const sellerBId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()
const guestSessionId = 'guest_session_12345'

beforeAll(async () => {
  if (process.env['MONGODB_URI'] && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env['MONGODB_URI'])
  } else if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'phase31_32' } })
    await mongoose.connect(mongoServer.getUri())
  }
})

afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect()
    await mongoServer.stop()
  }
})

describe('Phase 31 & 32 Enterprise Microservices Suite (Product & Cart)', () => {
  let createdProductId: string

  // ─── 1. Category System ───────────────────────────────────────────────────
  describe('Category System', () => {
    it('should create a new category and list active categories', async () => {
      const category = await createCategory({
        name: 'Smart Electronics',
        description: 'Cutting edge electronics',
      })
      expect(category).not.toBeNull()
      expect((category as any).slug).toBe('smart-electronics')

      const categories = (await getCategories()) as any[]
      expect(categories.length).toBeGreaterThan(0)
    })
  })

  // ─── 2. Brand System ──────────────────────────────────────────────────────
  describe('Brand System', () => {
    it('should create a new brand and list active brands', async () => {
      const brand = await createBrand({
        name: 'Truson Tech',
        description: 'Official Truson Brand',
      })
      expect(brand).not.toBeNull()
      expect((brand as any).slug).toBe('truson-tech')

      const brands = (await getBrands()) as any[]
      expect(brands.length).toBeGreaterThan(0)
    })
  })

  // ─── 3. Product Service & Lifecycle State Machine ──────────────────────────
  describe('Product Service & Ownership Security', () => {
    it('should create a product and enforce unique SKU', async () => {
      const productInput = {
        title: 'Truson Flagship Smartphone',
        description: 'Next-gen flagship smartphone with OLED display.',
        price: 999.99,
        category: 'Electronics' as const,
        stockQuantity: 50,
        sku: 'TRUSON-PHONE-001',
        images: ['https://example.com/phone.jpg'],
        tags: ['tech', 'phone'],
        isFeatured: true,
      }

      const product = await createProduct(sellerAId, productInput)
      expect(product).not.toBeNull()
      expect(product.status).toBe('PUBLISHED')
      createdProductId = (product._id as mongoose.Types.ObjectId).toString()

      // Enforce duplicate SKU rejection
      await expect(createProduct(sellerAId, productInput)).rejects.toThrow(/SKU.*already in use/)
    })

    it('should prevent Seller B from updating Seller A product (IDOR Protection)', async () => {
      await expect(
        updateProduct(createdProductId, sellerBId, { title: 'Hacked Title' }, false),
      ).rejects.toThrow(/Unauthorized: You do not own this product/)
    })

    it('should allow seller to create variant and enforce unique variant SKU', async () => {
      const variant = await createProductVariant(createdProductId, sellerAId, {
        sku: 'TRUSON-PHONE-001-BLK',
        title: 'Black 256GB',
        priceOverride: 1099.99,
        attributes: { color: 'Black', storage: '256GB' },
      })

      expect(variant).not.toBeNull()
      expect(variant.sku).toBe('TRUSON-PHONE-001-BLK')

      const variants = await getProductVariants(createdProductId)
      expect(variants.length).toBe(1)
    })

    it('should handle lifecycle status transitions safely', async () => {
      const suspended = await setProductStatus(createdProductId, 'SUSPENDED', sellerAId, true)
      expect(suspended.status).toBe('SUSPENDED')
      expect(suspended.isActive).toBe(false)

      const republished = await setProductStatus(createdProductId, 'PUBLISHED', sellerAId, true)
      expect(republished.status).toBe('PUBLISHED')
      expect(republished.isActive).toBe(true)
    })
  })

  // ─── 4. Cart Service ──────────────────────────────────────────────────────
  describe('Cart Service & Guest Cart Merging', () => {
    it('should create and fetch an active user cart', async () => {
      const cart = await getCart(userId)
      expect(cart).not.toBeNull()
      expect(cart.status).toBe('ACTIVE')
      expect(cart.items).toEqual([])
    })

    it('should add item to guest cart and calculate correct totals', async () => {
      const cart = await addToCart(undefined, guestSessionId, {
        productId: createdProductId,
        quantity: 2,
      })

      expect(cart).not.toBeNull()
      expect(cart.items.length).toBe(1)
      expect(cart.items[0].quantity).toBe(2)
      expect(cart.cartTotal).toBe(1999.98)
    })

    it('should merge guest session cart into authenticated user cart', async () => {
      const mergedCart = await mergeCart(userId, guestSessionId)
      expect(mergedCart).not.toBeNull()
      expect(mergedCart.userId?.toString()).toBe(userId)
      expect(mergedCart.items.length).toBe(1)
      expect(mergedCart.items[0].quantity).toBe(2)

      // Verify guest cart was cleaned up
      const guestCart = await Cart.findOne({ sessionId: guestSessionId })
      expect(guestCart).toBeNull()
    })

    it('should update item quantity and calculate updated subtotal', async () => {
      const updatedCart = await updateCartItem(userId, undefined, {
        productId: createdProductId,
        quantity: 3,
      } as any)

      expect(updatedCart.items[0].quantity).toBe(3)
      expect(updatedCart.cartTotal).toBe(2999.97)
    })

    it('should clear cart cleanly', async () => {
      await clearCart(userId)
      const cart = await getCart(userId)
      expect(cart.items.length).toBe(0)
      expect(cart.cartTotal).toBe(0)
    })
  })
})
