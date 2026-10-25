import { describe, it, expect, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { calculateSellerOrderAllocations } from '../../modules/order/orderShippingAllocation.js'
import {
  recordOrderSellerEarnings,
  reverseOrderSellerEarnings,
  clearCommissionPolicyCache,
} from '../../modules/fee/sellerFee.service.js'
import { confirmDelivery, getSellerOrders } from '../../modules/order/order.service.js'
import { SellerProfile } from '../../modules/seller/seller.model.js'
import {
  SellerLedger,
  SellerWithdrawal,
  SellerPayoutAccount,
} from '../../modules/seller/sellerPayout.model.js'
import { SellerFee } from '../../modules/fee/sellerFee.model.js'
import { MarketplaceCommissionPolicy } from '../../modules/fee/marketplaceFee.model.js'
import { Order } from '../../modules/order/order.model.js'
import { Product } from '../../modules/product/product.model.js'
import { Notification } from '../../modules/notification/notification.model.js'
import { User } from '../../modules/user/user.model.js'
import { ORDER_STATUS, ROLES } from '../../../../src/shared/constants/index.js'

describe('Seller-Independent Shipping, Customer Shipping Fee Payouts & Delivery Confirmation', () => {
  const sellerAId = new mongoose.Types.ObjectId()
  const sellerBId = new mongoose.Types.ObjectId()
  const buyerId = new mongoose.Types.ObjectId()
  const unauthorizedUserId = new mongoose.Types.ObjectId()
  const adminId = new mongoose.Types.ObjectId()
  const productAId = new mongoose.Types.ObjectId()
  const productBId = new mongoose.Types.ObjectId()

  const defaultShippingAddress = {
    fullName: 'Jane Buyer',
    phone: '08012345678',
    street: '123 Marina Street',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '100001',
    country: 'Nigeria',
  }

  beforeEach(async () => {
    await clearCommissionPolicyCache()

    // Reset database collections
    await Promise.all([
      MarketplaceCommissionPolicy.deleteMany({}),
      SellerProfile.deleteMany({}),
      SellerLedger.deleteMany({}),
      SellerWithdrawal.deleteMany({}),
      SellerPayoutAccount.deleteMany({}),
      SellerFee.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
      Notification.deleteMany({}),
      User.deleteMany({}),
    ])

    // Create test users
    await Promise.all([
      User.create({
        _id: buyerId,
        firstName: 'Jane',
        lastName: 'Buyer',
        username: 'janebuyer',
        email: 'buyer@cartival.com',
        role: ROLES.USER,
      }),
      User.create({
        _id: unauthorizedUserId,
        firstName: 'Intruder',
        lastName: 'User',
        username: 'intruder',
        email: 'intruder@cartival.com',
        role: ROLES.USER,
      }),
      User.create({
        _id: adminId,
        firstName: 'Admin',
        lastName: 'Cartival',
        username: 'cartivaladmin',
        email: 'admin@cartival.com',
        role: ROLES.ADMIN,
      }),
      User.create({
        _id: sellerAId,
        firstName: 'Seller',
        lastName: 'Alpha',
        username: 'selleralpha',
        email: 'sellerA@cartival.com',
        role: ROLES.SELLER,
      }),
      User.create({
        _id: sellerBId,
        firstName: 'Seller',
        lastName: 'Beta',
        username: 'sellerbeta',
        email: 'sellerB@cartival.com',
        role: ROLES.SELLER,
      }),
    ])

    // Create seller profiles
    await Promise.all([
      SellerProfile.create({
        userId: sellerAId,
        storeName: 'Alpha Logistics & Tech',
        totalSales: 0,
        totalEarnings: 0,
      }),
      SellerProfile.create({
        userId: sellerBId,
        storeName: 'Beta Home & Living',
        totalSales: 0,
        totalEarnings: 0,
      }),
    ])

    // Create products
    await Promise.all([
      Product.create({
        _id: productAId,
        sellerId: sellerAId,
        title: 'Solar Inverter 5kVA',
        description: 'High efficiency solar hybrid inverter',
        sku: 'SKU-SOLAR-001',
        price: 10000,
        stockQuantity: 10,
        category: 'Electronics',
      }),
      Product.create({
        _id: productBId,
        sellerId: sellerBId,
        title: 'Standing Fan Rechargeable',
        description: 'Long life rechargeable standing fan',
        sku: 'SKU-FAN-002',
        price: 20000,
        stockQuantity: 10,
        category: 'Home & Garden',
      }),
    ])
  })

  describe('1. calculateSellerOrderAllocations Pure Financial Calculation', () => {
    it('allocates 100% of customer shipping fee to single seller and computes exact payout', () => {
      const items = [
        {
          productId: productAId,
          sellerId: sellerAId,
          lineTotal: 10000,
          quantity: 1,
        },
      ]
      const shippingFee = 1500
      const commissionPerUnit = 200

      const allocMap = calculateSellerOrderAllocations(items, shippingFee, 'NGN', commissionPerUnit)
      const sellerA = allocMap.get(sellerAId.toString())

      expect(sellerA).toBeDefined()
      expect(sellerA?.productSubtotal).toBe(10000)
      expect(sellerA?.shippingFee).toBe(1500)
      expect(sellerA?.commissionAmount).toBe(200)
      expect(sellerA?.grossAmount).toBe(11500) // 10,000 + 1,500
      expect(sellerA?.netAmount).toBe(11300) // 11,500 - 200
    })

    it('proportionally divides customer shipping fee in multi-seller orders with remainder balancing', () => {
      const items = [
        {
          productId: productAId,
          sellerId: sellerAId,
          lineTotal: 30000,
          quantity: 1,
        },
        {
          productId: productBId,
          sellerId: sellerBId,
          lineTotal: 20000,
          quantity: 2,
        },
      ]
      const shippingFee = 2500
      const commissionPerUnit = 200

      const allocMap = calculateSellerOrderAllocations(items, shippingFee, 'NGN', commissionPerUnit)
      const sellerA = allocMap.get(sellerAId.toString())
      const sellerB = allocMap.get(sellerBId.toString())

      expect(sellerA).toBeDefined()
      expect(sellerB).toBeDefined()

      // Seller A: 30,000 / 50,000 = 60% of 2,500 = 1,500
      expect(sellerA?.productSubtotal).toBe(30000)
      expect(sellerA?.shippingFee).toBe(1500)
      expect(sellerA?.commissionAmount).toBe(200) // 1 unit * 200
      expect(sellerA?.grossAmount).toBe(31500)
      expect(sellerA?.netAmount).toBe(31300)

      // Seller B: 20,000 / 50,000 = 40% of 2,500 = 1,000
      expect(sellerB?.productSubtotal).toBe(20000)
      expect(sellerB?.shippingFee).toBe(1000)
      expect(sellerB?.commissionAmount).toBe(400) // 2 units * 200
      expect(sellerB?.grossAmount).toBe(21000)
      expect(sellerB?.netAmount).toBe(20600)

      // Total shipping fee allocated exactly matches order shipping fee
      expect((sellerA?.shippingFee || 0) + (sellerB?.shippingFee || 0)).toBe(shippingFee)
    })

    it('guarantees zero rounding leakage when splitting uneven shipping fees across sellers', () => {
      const items = [
        {
          productId: productAId,
          sellerId: sellerAId,
          lineTotal: 3333.33,
          quantity: 1,
        },
        {
          productId: productBId,
          sellerId: sellerBId,
          lineTotal: 6666.67,
          quantity: 1,
        },
      ]
      const shippingFee = 1000
      const commissionPerUnit = 200

      const allocMap = calculateSellerOrderAllocations(items, shippingFee, 'NGN', commissionPerUnit)
      const sellerA = allocMap.get(sellerAId.toString())
      const sellerB = allocMap.get(sellerBId.toString())

      expect((sellerA?.shippingFee || 0) + (sellerB?.shippingFee || 0)).toBe(shippingFee)
    })
  })

  describe('2. Seller Earnings Recording with Customer Shipping Fee', () => {
    it('credits seller ledger with product earnings + customer shipping fee - commission, and sends mandated notification', async () => {
      const order = new Order({
        orderNumber: 'ORD-SHIP-001',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        subtotal: 10000,
        shippingFee: 1500,
        taxAmount: 0,
        grandTotal: 11500,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
        ],
        sellerAllocations: [
          {
            sellerId: sellerAId,
            productSubtotal: 10000,
            shippingFee: 1500,
            grossAmount: 11500,
            commissionAmount: 200,
            netAmount: 11300,
            status: 'pending',
            fulfillmentStatus: 'unfulfilled',
          },
        ],
      })
      await order.save()

      await recordOrderSellerEarnings(order)

      // Verify Seller Ledger
      const ledgers = await SellerLedger.find({
        sellerId: sellerAId,
        referenceId: order.orderNumber,
      })
      expect(ledgers.length).toBe(1)
      const saleEntry = ledgers[0]
      expect(saleEntry.type).toBe('ORDER_SALE')
      expect(saleEntry.amount).toBe(11300) // (10000 product + 1500 shipping) - 200 commission
      expect(saleEntry.description).toContain('Shipping: NGN 1500.00')
      expect(saleEntry.description).toContain('Products: NGN 10000.00')
      expect(saleEntry.description).toContain('Net: NGN 11300.00')

      // Verify Seller Profile update
      const profile = await SellerProfile.findOne({ userId: sellerAId })
      expect(profile?.totalSales).toBe(11500) // Gross product + shipping
      expect(profile?.totalEarnings).toBe(11300) // Net payout

      // Verify Mandated "New Order — Shipping Required" Notification
      const notifications = await Notification.find({ userId: sellerAId })
      expect(notifications.length).toBeGreaterThanOrEqual(1)
      const newOrderNotif = notifications.find((n) => n.title === 'New Order — Shipping Required')
      expect(newOrderNotif).toBeDefined()
      expect(newOrderNotif?.message).toContain(
        'As an independent seller, you are responsible for preparing and shipping this product directly to the customer',
      )
      expect(newOrderNotif?.message).toContain(
        'The shipping fee paid by the customer for this order will be included in your payout calculation',
      )
    })

    it('correctly reverses seller earnings including shipping fee on refund', async () => {
      const order = new Order({
        orderNumber: 'ORD-REFUND-001',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        subtotal: 10000,
        shippingFee: 1500,
        grandTotal: 11500,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
        ],
        sellerAllocations: [
          {
            sellerId: sellerAId,
            productSubtotal: 10000,
            shippingFee: 1500,
            grossAmount: 11500,
            commissionAmount: 200,
            netAmount: 11300,
            status: 'pending',
            fulfillmentStatus: 'unfulfilled',
          },
        ],
      })
      await order.save()

      // First record earnings
      await recordOrderSellerEarnings(order)

      // Now reverse earnings
      await reverseOrderSellerEarnings(order, 11500)

      const profile = await SellerProfile.findOne({ userId: sellerAId })
      expect(profile?.totalSales).toBe(0)
      expect(profile?.totalEarnings).toBe(0)

      const reversalEntry = await SellerLedger.findOne({
        sellerId: sellerAId,
        type: 'ORDER_REFUND',
      })
      expect(reversalEntry).toBeDefined()
      expect(reversalEntry?.amount).toBe(-11300)
    })
  })

  describe('3. Customer Delivery Confirmation Workflow', () => {
    it('allows customer to confirm receipt of shipped order and dispatches mandated seller notification', async () => {
      const order = new Order({
        orderNumber: 'ORD-CONFIRM-001',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: ORDER_STATUS.SHIPPED,
        subtotal: 10000,
        shippingFee: 1500,
        grandTotal: 11500,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
        ],
        sellerAllocations: [
          {
            sellerId: sellerAId,
            productSubtotal: 10000,
            shippingFee: 1500,
            grossAmount: 11500,
            commissionAmount: 200,
            netAmount: 11300,
            status: 'pending',
            fulfillmentStatus: 'shipped',
          },
        ],
      })
      await order.save()

      const result = await confirmDelivery(order._id.toString(), buyerId.toString(), ROLES.USER)

      expect(result.alreadyConfirmed).toBe(false)
      expect(result.order.orderStatus).toBe(ORDER_STATUS.DELIVERED)
      expect(result.order.deliveryConfirmedAt).toBeDefined()
      expect(result.order.deliveryConfirmedBy?.toString()).toBe(buyerId.toString())
      expect(result.order.deliveryConfirmationSource).toBe('customer')
      expect(result.order.sellerAllocations?.[0].fulfillmentStatus).toBe('delivered_confirmed')

      // Verify Mandated "Delivery Successfully Confirmed" Notification to Seller
      const sellerNotif = await Notification.findOne({
        userId: sellerAId,
        title: 'Delivery Successfully Confirmed',
      })
      expect(sellerNotif).toBeDefined()
      expect(sellerNotif?.message).toContain(
        'The buyer has confirmed that your order was successfully delivered to their doorstep',
      )
      expect(sellerNotif?.message).toContain(
        'The shipping alert for this order has been cleared from your active seller dashboard',
      )
      expect(sellerNotif?.message).toContain(
        'The customer-paid shipping fee is included in your payout calculation',
      )

      // Verify Mandated "Buyer Confirmed Successful Delivery" Notification to Admin
      const adminNotif = await Notification.findOne({
        userId: adminId,
        title: 'Buyer Confirmed Successful Delivery',
      })
      expect(adminNotif).toBeDefined()
      expect(adminNotif?.message).toContain('The buyer has confirmed successful delivery for Order')

      // Test idempotency: confirming again returns alreadyConfirmed without duplicate entries
      const secondCall = await confirmDelivery(order._id.toString(), buyerId.toString(), ROLES.USER)
      expect(secondCall.alreadyConfirmed).toBe(true)
    })

    it('rejects confirmation by an unauthorized user who is not the buyer or admin', async () => {
      const order = new Order({
        orderNumber: 'ORD-UNAUTH-001',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: ORDER_STATUS.SHIPPED,
        subtotal: 10000,
        shippingFee: 1500,
        grandTotal: 11500,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
        ],
      })
      await order.save()

      await expect(
        confirmDelivery(order._id.toString(), unauthorizedUserId.toString(), ROLES.USER),
      ).rejects.toThrow('You are not authorized to confirm delivery for this order')
    })

    it('rejects confirmation if the order has not been shipped yet', async () => {
      const order = new Order({
        orderNumber: 'ORD-PENDING-001',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: ORDER_STATUS.PENDING,
        subtotal: 10000,
        shippingFee: 1500,
        grandTotal: 11500,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
        ],
      })
      await order.save()

      await expect(
        confirmDelivery(order._id.toString(), buyerId.toString(), ROLES.USER),
      ).rejects.toThrow('The order must be shipped first')
    })

    it('allows Cartival Mall admin to confirm delivery on behalf of customer', async () => {
      const order = new Order({
        orderNumber: 'ORD-ADMIN-001',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: ORDER_STATUS.SHIPPED,
        subtotal: 10000,
        shippingFee: 1500,
        grandTotal: 11500,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
        ],
      })
      await order.save()

      const result = await confirmDelivery(order._id.toString(), adminId.toString(), ROLES.ADMIN)
      expect(result.order.orderStatus).toBe(ORDER_STATUS.DELIVERED)
      expect(result.order.deliveryConfirmationSource).toBe('admin')
    })
  })

  describe('4. Seller Orders Isolation & Financial Breakdown', () => {
    it('isolates seller items and calculates accurate breakdown with customer shipping fee included', async () => {
      const order = new Order({
        orderNumber: 'ORD-MULTI-ISOLATE',
        userId: buyerId,
        currency: 'NGN',
        paymentStatus: 'paid',
        orderStatus: ORDER_STATUS.CONFIRMED,
        subtotal: 30000,
        shippingFee: 2000,
        grandTotal: 32000,
        shippingAddress: defaultShippingAddress,
        items: [
          {
            productId: productAId,
            sellerId: sellerAId,
            title: 'Solar Inverter 5kVA',
            sku: 'SKU-SOLAR-001',
            quantity: 1,
            itemPrice: 10000,
            lineTotal: 10000,
          },
          {
            productId: productBId,
            sellerId: sellerBId,
            title: 'Standing Fan Rechargeable',
            sku: 'SKU-FAN-002',
            quantity: 1,
            itemPrice: 20000,
            lineTotal: 20000,
          },
        ],
        sellerAllocations: [
          {
            sellerId: sellerAId,
            productSubtotal: 10000,
            shippingFee: 666.67,
            grossAmount: 10666.67,
            commissionAmount: 200,
            netAmount: 10466.67,
            status: 'pending',
            fulfillmentStatus: 'unfulfilled',
          },
          {
            sellerId: sellerBId,
            productSubtotal: 20000,
            shippingFee: 1333.33,
            grossAmount: 21333.33,
            commissionAmount: 200,
            netAmount: 21133.33,
            status: 'pending',
            fulfillmentStatus: 'unfulfilled',
          },
        ],
      })
      await order.save()

      // Retrieve orders for Seller A
      const resA = await getSellerOrders(sellerAId.toString(), { page: 1, limit: 10 })
      expect(resA.total).toBe(1)
      const orderA = resA.orders[0] as any

      // Data isolation: Only Seller A's item is returned
      expect(orderA.items.length).toBe(1)
      expect(orderA.items[0].sellerId.toString()).toBe(sellerAId.toString())

      // Financial breakdown: reflects customer shipping fee allocated to Seller A
      expect(orderA.sellerBreakdown).toBeDefined()
      expect(orderA.sellerBreakdown.sellerProductSubtotal).toBe(10000)
      expect(orderA.sellerBreakdown.sellerShippingFee).toBe(666.67)
      expect(orderA.sellerBreakdown.sellerCommission).toBe(200)
      expect(orderA.sellerBreakdown.sellerGrossAmount).toBe(10666.67)
      expect(orderA.sellerBreakdown.sellerNetAmount).toBe(10466.67)
    })
  })
})
