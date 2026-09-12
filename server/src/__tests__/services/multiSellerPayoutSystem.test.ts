import { describe, it, expect, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import {
  recordOrderSellerEarnings,
  reverseOrderSellerEarnings,
  clearCommissionPolicyCache,
} from '../../modules/fee/sellerFee.service.js'
import { requestWithdrawal } from '../../modules/seller/seller.service.js'
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

describe('Multi-Seller Marketplace Payment, Ledger & Payout System', () => {
  const sellerAId = new mongoose.Types.ObjectId()
  const sellerBId = new mongoose.Types.ObjectId()
  const buyerId = new mongoose.Types.ObjectId()
  const productAId = new mongoose.Types.ObjectId()
  const productBId = new mongoose.Types.ObjectId()

  beforeEach(async () => {
    await clearCommissionPolicyCache()
    // Reset test database collections
    await Promise.all([
      MarketplaceCommissionPolicy.deleteMany({}),
      SellerProfile.deleteMany({}),
      SellerLedger.deleteMany({}),
      SellerWithdrawal.deleteMany({}),
      SellerPayoutAccount.deleteMany({}),
      SellerFee.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
    ])

    // Create seller profiles
    await Promise.all([
      SellerProfile.create({
        userId: sellerAId,
        storeName: 'Alpha Store',
        totalSales: 0,
        totalEarnings: 0,
      }),
      SellerProfile.create({
        userId: sellerBId,
        storeName: 'Beta Boutique',
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
        price: 20000,
        stockQuantity: 10,
        category: 'Electronics',
      }),
      Product.create({
        _id: productBId,
        sellerId: sellerBId,
        title: 'Lithium Battery Pack',
        description: 'Long life 48V lithium iron phosphate battery',
        sku: 'SKU-BATT-002',
        price: 30000,
        stockQuantity: 10,
        category: 'Electronics',
      }),
    ])
  })

  it('correctly splits multi-seller cart items and credits net earnings to respective seller ledgers', async () => {
    const order = new Order({
      orderNumber: 'ORD-MULTI-001',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      paymentProvider: 'paystack',
      paystackReference: 'TSM-ORD-MULTI-001',
      subtotal: 50000,
      grandTotal: 51000,
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Solar Inverter 5kVA',
          sku: 'SKU-SOLAR-001',
          quantity: 1,
          itemPrice: 20000,
          price: 20000,
          lineTotal: 20000,
        },
        {
          productId: productBId,
          sellerId: sellerBId,
          title: 'Lithium Battery Pack',
          sku: 'SKU-BATT-002',
          quantity: 1,
          itemPrice: 30000,
          price: 30000,
          lineTotal: 30000,
        },
      ],
      pricing: {
        subtotal: 50000,
        shippingFee: 1000,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 51000,
      },
      shippingAddress: {
        fullName: 'John Doe',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        postalCode: '100001',
        country: 'Nigeria',
      },
    })
    await order.save()

    // Process order earnings
    await recordOrderSellerEarnings(order)

    // Verify Seller A (Gross 20,000, Commission 200, Net 19,800)
    const ledgerA = await SellerLedger.find({ sellerId: sellerAId })
    expect(ledgerA).toHaveLength(1)
    expect(ledgerA[0].type).toBe('ORDER_SALE')
    expect(ledgerA[0].amount).toBe(19800)
    expect(ledgerA[0].balanceAfter).toBe(19800)

    const profileA = await SellerProfile.findOne({ userId: sellerAId })
    expect(profileA?.totalSales).toBe(20000)
    expect(profileA?.totalEarnings).toBe(19800)

    // Verify Seller B (Gross 30,000, Commission 200, Net 29,800)
    const ledgerB = await SellerLedger.find({ sellerId: sellerBId })
    expect(ledgerB).toHaveLength(1)
    expect(ledgerB[0].type).toBe('ORDER_SALE')
    expect(ledgerB[0].amount).toBe(29800)
    expect(ledgerB[0].balanceAfter).toBe(29800)

    const profileB = await SellerProfile.findOne({ userId: sellerBId })
    expect(profileB?.totalSales).toBe(30000)
    expect(profileB?.totalEarnings).toBe(29800)

    // Verify individual SellerFee documents recorded
    const fees = await SellerFee.find({ orderId: order._id })
    expect(fees).toHaveLength(2)
  })

  it('enforces idempotency on duplicate payment confirmations / webhook retries', async () => {
    const order = new Order({
      orderNumber: 'ORD-IDEMP-002',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      subtotal: 40000,
      grandTotal: 41000,
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Solar Inverter 5kVA',
          sku: 'SKU-SOLAR-001',
          quantity: 2,
          itemPrice: 20000,
          price: 20000,
          lineTotal: 40000,
        },
      ],
      pricing: {
        subtotal: 40000,
        shippingFee: 1000,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 41000,
      },
      shippingAddress: {
        fullName: 'Jane Doe',
        phone: '08098765432',
        street: '456 Commercial Way',
        city: 'Abuja',
        state: 'FCT',
        postalCode: '900001',
        country: 'Nigeria',
      },
    })
    await order.save()

    // First processing
    await recordOrderSellerEarnings(order)
    // Duplicate webhook call
    await recordOrderSellerEarnings(order)

    const ledgerEntries = await SellerLedger.find({
      sellerId: sellerAId,
      referenceId: 'ORD-IDEMP-002',
    })
    expect(ledgerEntries).toHaveLength(1)

    const profile = await SellerProfile.findOne({ userId: sellerAId })
    expect(profile?.totalSales).toBe(40000)
    // 40,000 - (2 * 200) = 39,600
    expect(profile?.totalEarnings).toBe(39600)
  })

  it('creates compensating ORDER_REFUND entries on refund without silent balance tampering', async () => {
    const order = new Order({
      orderNumber: 'ORD-REFUND-003',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      subtotal: 20000,
      grandTotal: 21000,
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Solar Inverter 5kVA',
          sku: 'SKU-SOLAR-001',
          quantity: 1,
          itemPrice: 20000,
          price: 20000,
          lineTotal: 20000,
        },
      ],
      pricing: {
        subtotal: 20000,
        shippingFee: 1000,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 21000,
      },
      shippingAddress: {
        fullName: 'Alice',
        phone: '08055555555',
        street: '789 Trade Lane',
        city: 'Enugu',
        state: 'Enugu',
        postalCode: '400001',
        country: 'Nigeria',
      },
    })
    await order.save()

    await recordOrderSellerEarnings(order)
    await reverseOrderSellerEarnings(order)

    const ledgerEntries = await SellerLedger.find({ sellerId: sellerAId }).sort({ createdAt: 1 })
    expect(ledgerEntries).toHaveLength(2)
    expect(ledgerEntries[0].type).toBe('ORDER_SALE')
    expect(ledgerEntries[0].amount).toBe(19800)

    expect(ledgerEntries[1].type).toBe('ORDER_REFUND')
    expect(ledgerEntries[1].amount).toBe(-19800)
    expect(ledgerEntries[1].balanceAfter).toBe(0)

    const profile = await SellerProfile.findOne({ userId: sellerAId })
    expect(profile?.totalSales).toBe(0)
    expect(profile?.totalEarnings).toBe(0)
  })

  it('rejects withdrawal requests exceeding available balance or with invalid amounts', async () => {
    const payoutAccount = await SellerPayoutAccount.create({
      sellerId: sellerAId,
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      accountName: 'Alpha Store Ltd',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })

    // Available balance is 0
    await expect(
      requestWithdrawal(sellerAId.toString(), {
        amount: 5000,
        payoutAccountId: payoutAccount._id.toString(),
      }),
    ).rejects.toThrow(/Insufficient available balance/)

    // Negative / Zero amount
    await expect(
      requestWithdrawal(sellerAId.toString(), {
        amount: -100,
        payoutAccountId: payoutAccount._id.toString(),
      }),
    ).rejects.toThrow(/Invalid withdrawal amount/)
  })

  it('prevents double-payouts through idempotency keys', async () => {
    // Credit seller via a paid order
    const order = new Order({
      orderNumber: 'ORD-PAYOUT-004',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      subtotal: 20000,
      grandTotal: 21000,
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Solar Inverter 5kVA',
          sku: 'SKU-SOLAR-001',
          quantity: 1,
          itemPrice: 20000,
          price: 20000,
          lineTotal: 20000,
        },
      ],
      pricing: {
        subtotal: 20000,
        shippingFee: 1000,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 21000,
      },
      shippingAddress: {
        fullName: 'Bob',
        phone: '08022222222',
        street: '10 Industrial Rd',
        city: 'Kano',
        state: 'Kano',
        postalCode: '700001',
        country: 'Nigeria',
      },
    })
    await order.save()

    const payoutAccount = await SellerPayoutAccount.create({
      sellerId: sellerAId,
      bankName: 'GTBank',
      bankCode: '058',
      accountNumber: '0987654321',
      accountName: 'Alpha Store Payouts',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })

    const idempotencyKey = 'IDEM-PAYOUT-TEST-999'

    // First request
    const w1 = await requestWithdrawal(sellerAId.toString(), {
      amount: 5000,
      payoutAccountId: payoutAccount._id.toString(),
      idempotencyKey,
    })

    // Concurrent / Retry request with same key
    const w2 = await requestWithdrawal(sellerAId.toString(), {
      amount: 5000,
      payoutAccountId: payoutAccount._id.toString(),
      idempotencyKey,
    })

    expect(w1._id.toString()).toBe(w2._id.toString())

    const totalWithdrawals = await SellerWithdrawal.countDocuments({ idempotencyKey })
    expect(totalWithdrawals).toBe(1)
  })
})
