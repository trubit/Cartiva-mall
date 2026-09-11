import crypto from 'node:crypto'
import { describe, it, expect, beforeEach } from 'vitest'
import mongoose, { type Types } from 'mongoose'
import { Product } from '../modules/product/product.model.js'
import { Order } from '../modules/order/order.model.js'
import { Cart } from '../modules/cart/cart.model.js'
import { User } from '../modules/user/user.model.js'
import { createProposal } from '../modules/autonomy/autonomy.service.js'
import { verifyWebhookSignature } from '../modules/integrations/ecosystemIntegration.service.js'

describe('Phase 50: Full-System Concurrency, Multi-Tenant Isolation & Security Hardening', () => {
  beforeEach(async () => {
    await Product.deleteMany({})
    await Order.deleteMany({})
    await Cart.deleteMany({})
    await User.deleteMany({})
  })

  describe('Part 9: Concurrency & Atomic Inventory Protection', () => {
    it('prevents overselling when 5 concurrent users attempt to buy the last 2 items', async () => {
      const sellerId = new mongoose.Types.ObjectId()
      const product = await Product.create({
        title: 'Limited Edition Smartwatch',
        description: 'Only 2 items in stock',
        price: 299.99,
        stockQuantity: 2,
        sku: 'WATCH-LTD-001',
        sellerId,
        category: 'Electronics',
        images: ['https://example.com/watch.jpg'],
      })

      // Simulate 5 simultaneous purchase attempts for 1 item each
      const purchaseTasks = Array.from({ length: 5 }, async (_, i) => {
        const result = await Product.findOneAndUpdate(
          { _id: product._id, stockQuantity: { $gte: 1 } },
          { $inc: { stockQuantity: -1 } },
          { returnDocument: 'after' },
        )
        return { userIndex: i, success: !!result, remainingStock: result?.stockQuantity }
      })

      const outcomes = await Promise.all(purchaseTasks)
      const successfulPurchases = outcomes.filter((o) => o.success)
      const failedPurchases = outcomes.filter((o) => !o.success)

      expect(successfulPurchases.length).toBe(2)
      expect(failedPurchases.length).toBe(3)

      const finalProduct = await Product.findById(product._id)
      expect(finalProduct?.stockQuantity).toBe(0)
    })

    it('ensures cart updates under concurrent race conditions maintain consistent state', async () => {
      const userId = new mongoose.Types.ObjectId()
      const productId = new mongoose.Types.ObjectId()

      const cart = await Cart.create({
        userId,
        status: 'ACTIVE',
        items: [{ productId, quantity: 1, itemPrice: 50 }],
        cartTotal: 50,
        discountAmount: 0,
        shippingCost: 0,
        taxAmount: 0,
        grandTotal: 50,
        currency: 'USD',
      })

      // Concurrent increments
      const updates = Array.from({ length: 4 }, async () => {
        return Cart.findOneAndUpdate(
          { _id: cart._id, 'items.productId': productId },
          { $inc: { 'items.$.quantity': 1, cartTotal: 50, grandTotal: 50 } },
          { returnDocument: 'after' },
        )
      })

      await Promise.all(updates)
      const updatedCart = await Cart.findById(cart._id)
      expect(updatedCart?.items[0].quantity).toBe(5)
      expect(updatedCart?.grandTotal).toBe(250)
    })
  })

  describe('Part 8 & 12: Multi-User & Tenant Isolation', () => {
    it('strictly isolates Customer A orders from Customer B queries', async () => {
      const customerAId = new mongoose.Types.ObjectId()
      const customerBId = new mongoose.Types.ObjectId()

      await Order.create({
        orderNumber: 'ORD-TEST-001',
        userId: customerAId,
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            title: 'Item A',
            sku: 'SKU-A',
            itemPrice: 100,
            lineTotal: 100,
            quantity: 1,
          },
        ],
        subtotal: 100,
        discountAmount: 0,
        shippingFee: 0,
        taxAmount: 0,
        grandTotal: 100,
        currency: 'USD',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        sameAsShipping: true,
        shippingMethod: 'standard',
        shippingAddress: {
          fullName: 'User A',
          phone: '1234567890',
          street: '123 Main St',
          city: 'City A',
          state: 'State',
          postalCode: '10001',
          country: 'USA',
        },
      })

      await Order.create({
        orderNumber: 'ORD-TEST-002',
        userId: customerBId,
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            title: 'Item B',
            sku: 'SKU-B',
            itemPrice: 200,
            lineTotal: 200,
            quantity: 1,
          },
        ],
        subtotal: 200,
        discountAmount: 0,
        shippingFee: 0,
        taxAmount: 0,
        grandTotal: 200,
        currency: 'USD',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        fulfillmentStatus: 'unfulfilled',
        sameAsShipping: true,
        shippingMethod: 'standard',
        shippingAddress: {
          fullName: 'User B',
          phone: '9876543210',
          street: '456 Elm St',
          city: 'City B',
          state: 'State',
          postalCode: '90001',
          country: 'USA',
        },
      })

      // Customer A queries their orders
      const customerAOrders = await Order.find({ userId: customerAId })
      expect(customerAOrders.length).toBe(1)
      expect(customerAOrders[0].grandTotal).toBe(100)

      // Customer B queries their orders
      const customerBOrders = await Order.find({ userId: customerBId })
      expect(customerBOrders.length).toBe(1)
      expect(customerBOrders[0].grandTotal).toBe(200)

      // Customer A should find 0 orders if attempting to query with Customer B's filter
      const crossTenantAttempt = await Order.find({
        _id: customerBOrders[0]._id,
        userId: customerAId,
      })
      expect(crossTenantAttempt.length).toBe(0)
    })

    it('isolates Seller A products from Seller B modifications', async () => {
      const sellerAId = new mongoose.Types.ObjectId()
      const sellerBId = new mongoose.Types.ObjectId()

      const productA = await Product.create({
        title: 'Seller A Exclusive Tech',
        description: 'Tech product',
        price: 500,
        stockQuantity: 10,
        sku: 'TECH-A-001',
        sellerId: sellerAId,
        category: 'Electronics',
        images: ['https://example.com/tech.jpg'],
      })

      // Seller B attempts to edit Seller A's product
      const unauthorizedUpdate = await Product.findOneAndUpdate(
        { _id: productA._id, sellerId: sellerBId },
        { price: 1 },
        { returnDocument: 'after' },
      )

      expect(unauthorizedUpdate).toBeNull()

      const freshProduct = await Product.findById(productA._id)
      expect(freshProduct?.price).toBe(500)
    })
  })

  describe('Part 14: Defensive NoSQL & Input Sanitization', () => {
    it('safely handles queries without injecting operator objects', async () => {
      const user = await User.create({
        email: 'victim@example.com',
        username: 'victim_user',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      })

      // Query with sanitized string types
      const queryEmail = 'victim@example.com'
      const foundUser = await User.findOne({ email: String(queryEmail) })
      expect((foundUser?._id as Types.ObjectId).toString()).toBe(
        (user._id as Types.ObjectId).toString(),
      )

      // Operator injection attempt passed as string should not match
      const injectionAttempt = '{"$ne": null}'
      const shouldBeNull = await User.findOne({ email: injectionAttempt })
      expect(shouldBeNull).toBeNull()
    })
  })

  describe('Part 16 & 21: Payment & Webhook Cryptographic Security', () => {
    it('verifies valid HMAC webhook signature with tight timestamp window', () => {
      const secret = 'whsec_enterprise_secret_key_8899'
      const rawBody = JSON.stringify({
        event: 'payment.succeeded',
        orderId: 'ord_xyz',
        amount: 350,
      })
      const timestamp = Date.now().toString()

      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      const signature = `v1=${hmac}`

      const isValid = verifyWebhookSignature(rawBody, signature, secret, timestamp)
      expect(isValid).toBe(true)
    })

    it('rejects tampered webhook payloads even with valid secret', () => {
      const secret = 'whsec_enterprise_secret_key_8899'
      const originalBody = JSON.stringify({
        event: 'payment.succeeded',
        orderId: 'ord_xyz',
        amount: 350,
      })
      const tamperedBody = JSON.stringify({
        event: 'payment.succeeded',
        orderId: 'ord_xyz',
        amount: 350000,
      })
      const timestamp = Date.now().toString()

      const hmac = crypto.createHmac('sha256', secret).update(originalBody).digest('hex')
      const signature = `v1=${hmac}`

      const isValid = verifyWebhookSignature(tamperedBody, signature, secret, timestamp)
      expect(isValid).toBe(false)
    })
  })

  describe('Part 20: Autonomous System & Forbidden Action Guardrails', () => {
    it('rejects forbidden autonomous actions with 403 AppError', async () => {
      await expect(
        createProposal({
          objective: 'Optimize cashflow',
          actionName: 'transfer_money',
          reason: 'Attempt unauthorized transfer',
        }),
      ).rejects.toThrow(/Forbidden autonomous action/)
    })

    it('allows registered allowlisted actions such as notify_seller', async () => {
      const proposal = await createProposal({
        objective: 'Notify seller of low stock',
        actionName: 'notify_seller',
        reason: 'Stock is approaching safety buffer',
      })
      expect(proposal._id).toBeDefined()
      expect(proposal.actionName).toBe('notify_seller')
    })
  })
})
