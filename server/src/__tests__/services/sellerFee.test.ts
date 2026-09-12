import { describe, it, expect, beforeEach } from 'vitest'
import { User } from '../../modules/user/user.model.js'
import { SellerProfile } from '../../modules/seller/seller.model.js'
import { Product } from '../../modules/product/product.model.js'
import { Order } from '../../modules/order/order.model.js'
import { SellerFee } from '../../modules/fee/sellerFee.model.js'
import { SellerLedger } from '../../modules/seller/sellerPayout.model.js'
import { MarketplaceCommissionPolicy } from '../../modules/fee/marketplaceFee.model.js'
import * as sellerFeeService from '../../modules/fee/sellerFee.service.js'

beforeEach(async () => {
  await sellerFeeService.clearCommissionPolicyCache()
  await MarketplaceCommissionPolicy.deleteMany({})
  await User.deleteMany({})
  await SellerProfile.deleteMany({})
  await Product.deleteMany({})
  await Order.deleteMany({})
  await SellerFee.deleteMany({})
  await SellerLedger.deleteMany({})
})

describe('Cartiva Marketplace Commission & Seller Earnings Engine', () => {
  it('calculates ₦200 NGN per unit commission accurately for 1, 2, 5, and 10 units in NGN', async () => {
    const seller = await User.create({
      firstName: 'Seller',
      lastName: 'One',
      username: 'sellerone',
      email: 'seller1@example.com',
      role: 'seller',
    })
    await SellerProfile.create({
      userId: seller._id,
      storeName: 'Test Store',
      accountStatus: 'ACTIVE',
    })

    const product = await Product.create({
      title: 'Sample Product',
      description: 'Desc',
      price: 7000,
      category: 'Electronics',
      stockQuantity: 500,
      sku: 'SKU-FEE-1',
      sellerId: seller._id,
    })

    // Test 1 unit: 1 × ₦200 = ₦200 NGN
    const order1 = await Order.create({
      orderNumber: 'ORD-COMM-1',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 1,
          itemPrice: 7000,
          lineTotal: 7000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'Nigeria',
        state: 'Lagos',
        city: 'Ikeja',
        street: 'Street',
        postalCode: '100001',
      },
      subtotal: 7000,
      grandTotal: 7000,
      currency: 'NGN',
    })

    const fee1 = await sellerFeeService.createSellerFeeForOrderItem(
      order1,
      order1.items[0],
      'paystack',
    )
    expect(fee1).not.toBeNull()
    expect(fee1?.feePerUnit).toBe(200)
    expect(fee1?.currency).toBe('NGN')
    expect(fee1?.totalFee).toBe(200)

    // Test 2 units: 2 × ₦200 = ₦400 NGN
    const order2 = await Order.create({
      orderNumber: 'ORD-COMM-2',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 2,
          itemPrice: 7000,
          lineTotal: 14000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'Nigeria',
        state: 'Lagos',
        city: 'Ikeja',
        street: 'Street',
        postalCode: '100001',
      },
      subtotal: 14000,
      grandTotal: 14000,
      currency: 'NGN',
    })

    const fee2 = await sellerFeeService.createSellerFeeForOrderItem(
      order2,
      order2.items[0],
      'paystack',
    )
    expect(fee2?.totalFee).toBe(400)

    // Test 5 units: 5 × ₦200 = ₦1,000 NGN
    const order5 = await Order.create({
      orderNumber: 'ORD-COMM-5',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 5,
          itemPrice: 7000,
          lineTotal: 35000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'Nigeria',
        state: 'Lagos',
        city: 'Ikeja',
        street: 'Street',
        postalCode: '100001',
      },
      subtotal: 35000,
      grandTotal: 35000,
      currency: 'NGN',
    })

    const fee5 = await sellerFeeService.createSellerFeeForOrderItem(
      order5,
      order5.items[0],
      'paystack',
    )
    expect(fee5?.totalFee).toBe(1000)

    // Test 10 units: 10 × ₦200 = ₦2,000 NGN
    const order10 = await Order.create({
      orderNumber: 'ORD-COMM-10',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 10,
          itemPrice: 7000,
          lineTotal: 70000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'Nigeria',
        state: 'Lagos',
        city: 'Ikeja',
        street: 'Street',
        postalCode: '100001',
      },
      subtotal: 70000,
      grandTotal: 70000,
      currency: 'NGN',
    })

    const fee10 = await sellerFeeService.createSellerFeeForOrderItem(
      order10,
      order10.items[0],
      'paystack',
    )
    expect(fee10?.totalFee).toBe(2000)
  })

  it('calculates USD $0.15 per unit commission correctly for 1, 2, 5, and 10 units in USD', async () => {
    const seller = await User.create({
      firstName: 'Seller',
      lastName: 'USD',
      username: 'sellerusd',
      email: 'sellerusd@example.com',
      role: 'seller',
    })

    const product = await Product.create({
      title: 'USD Product',
      description: 'Desc',
      price: 100,
      category: 'Electronics',
      stockQuantity: 500,
      sku: 'SKU-USD-1',
      sellerId: seller._id,
    })

    // 1 unit: 1 × $0.15 = $0.15 USD
    const order1 = await Order.create({
      orderNumber: 'ORD-USD-1',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 1,
          itemPrice: 100,
          lineTotal: 100,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'US',
        state: 'NY',
        city: 'NYC',
        street: '5th Ave',
        postalCode: '10001',
      },
      subtotal: 100,
      grandTotal: 100,
      currency: 'USD',
    })

    const fee1 = await sellerFeeService.createSellerFeeForOrderItem(
      order1,
      order1.items[0],
      'paystack',
    )
    expect(fee1?.feePerUnit).toBe(0.15)
    expect(fee1?.totalFee).toBe(0.15)

    // 2 units: 2 × $0.15 = $0.30 USD
    const order2 = await Order.create({
      orderNumber: 'ORD-USD-2',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 2,
          itemPrice: 100,
          lineTotal: 200,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'US',
        state: 'NY',
        city: 'NYC',
        street: '5th Ave',
        postalCode: '10001',
      },
      subtotal: 200,
      grandTotal: 200,
      currency: 'USD',
    })
    const fee2 = await sellerFeeService.createSellerFeeForOrderItem(
      order2,
      order2.items[0],
      'paystack',
    )
    expect(fee2?.totalFee).toBe(0.3)

    // 5 units: 5 × $0.15 = $0.75 USD
    const order5 = await Order.create({
      orderNumber: 'ORD-USD-5',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 5,
          itemPrice: 100,
          lineTotal: 500,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'US',
        state: 'NY',
        city: 'NYC',
        street: '5th Ave',
        postalCode: '10001',
      },
      subtotal: 500,
      grandTotal: 500,
      currency: 'USD',
    })
    const fee5 = await sellerFeeService.createSellerFeeForOrderItem(
      order5,
      order5.items[0],
      'paystack',
    )
    expect(fee5?.totalFee).toBe(0.75)

    // 10 units: 10 × $0.15 = $1.50 USD
    const order10 = await Order.create({
      orderNumber: 'ORD-USD-10',
      userId: seller._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: product.sku,
          quantity: 10,
          itemPrice: 100,
          lineTotal: 1000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'US',
        state: 'NY',
        city: 'NYC',
        street: '5th Ave',
        postalCode: '10001',
      },
      subtotal: 1000,
      grandTotal: 1000,
      currency: 'USD',
    })
    const fee10 = await sellerFeeService.createSellerFeeForOrderItem(
      order10,
      order10.items[0],
      'paystack',
    )
    expect(fee10?.totalFee).toBe(1.5)
  })

  it('atomically credits seller net earnings and separates multi-product / multi-seller commissions', async () => {
    const sellerA = await User.create({
      firstName: 'Seller',
      lastName: 'A',
      username: 'sellera',
      email: 'sellera@example.com',
      role: 'seller',
    })
    await SellerProfile.create({
      userId: sellerA._id,
      storeName: 'Store A',
      totalSales: 0,
      totalEarnings: 0,
    })

    const sellerB = await User.create({
      firstName: 'Seller',
      lastName: 'B',
      username: 'sellerb',
      email: 'sellerb@example.com',
      role: 'seller',
    })
    await SellerProfile.create({
      userId: sellerB._id,
      storeName: 'Store B',
      totalSales: 0,
      totalEarnings: 0,
    })

    const prodA = await Product.create({
      title: 'Product A',
      description: 'Description A',
      price: 10000,
      category: 'Electronics',
      stockQuantity: 100,
      sku: 'SKU-A',
      sellerId: sellerA._id,
    })

    const prodB = await Product.create({
      title: 'Product B',
      description: 'Description B',
      price: 5000,
      category: 'Clothing & Fashion',
      stockQuantity: 100,
      sku: 'SKU-B',
      sellerId: sellerB._id,
    })

    // Multi-seller order:
    // Seller A: 2 units × ₦10,000 = ₦20,000 Gross, Commission = 2 × ₦200 = ₦400, Net = ₦19,600
    // Seller B: 3 units × ₦5,000 = ₦15,000 Gross, Commission = 3 × ₦200 = ₦600, Net = ₦14,400
    const order = await Order.create({
      orderNumber: 'ORD-MULTI-1',
      userId: sellerA._id,
      items: [
        {
          productId: prodA._id,
          sellerId: sellerA._id,
          title: prodA.title,
          sku: prodA.sku,
          quantity: 2,
          itemPrice: 10000,
          lineTotal: 20000,
        },
        {
          productId: prodB._id,
          sellerId: sellerB._id,
          title: prodB.title,
          sku: prodB.sku,
          quantity: 3,
          itemPrice: 5000,
          lineTotal: 15000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '123',
        country: 'Nigeria',
        state: 'Lagos',
        city: 'Ikeja',
        street: 'Street',
        postalCode: '100001',
      },
      subtotal: 35000,
      grandTotal: 35000,
      currency: 'NGN',
    })

    await sellerFeeService.recordOrderSellerEarnings(order)

    // Verify Seller A ledger & profile
    const ledgerA = await SellerLedger.findOne({
      sellerId: sellerA._id,
      referenceId: order.orderNumber,
    })
    expect(ledgerA).not.toBeNull()
    expect(ledgerA?.amount).toBe(19600)

    const profileA = await SellerProfile.findOne({ userId: sellerA._id })
    expect(profileA?.totalSales).toBe(20000)
    expect(profileA?.totalEarnings).toBe(19600)

    // Verify Seller B ledger & profile
    const ledgerB = await SellerLedger.findOne({
      sellerId: sellerB._id,
      referenceId: order.orderNumber,
    })
    expect(ledgerB).not.toBeNull()
    expect(ledgerB?.amount).toBe(14400)

    const profileB = await SellerProfile.findOne({ userId: sellerB._id })
    expect(profileB?.totalSales).toBe(15000)
    expect(profileB?.totalEarnings).toBe(14400)

    // Idempotency: calling recordOrderSellerEarnings a second time should NOT double credit
    await sellerFeeService.recordOrderSellerEarnings(order)
    const countA = await SellerLedger.countDocuments({
      sellerId: sellerA._id,
      referenceId: order.orderNumber,
    })
    expect(countA).toBe(1)
    const profileA2 = await SellerProfile.findOne({ userId: sellerA._id })
    expect(profileA2?.totalEarnings).toBe(19600)
  })
})
