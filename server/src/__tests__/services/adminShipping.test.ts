import { describe, it, expect, beforeEach } from 'vitest'
import { User } from '../../modules/user/user.model.js'
import { Product } from '../../modules/product/product.model.js'
import { Checkout } from '../../modules/checkout/checkout.model.js'
import { Order } from '../../modules/order/order.model.js'
import { ShippingConfig } from '../../modules/shipping/shippingConfig.model.js'
import * as shippingConfigService from '../../modules/shipping/shippingConfig.service.js'
import * as orderService from '../../modules/order/order.service.js'
import { toMinorUnits } from '../../../../src/shared/utils/money.js'

beforeEach(async () => {
  await User.deleteMany({})
  await Product.deleteMany({})
  await Checkout.deleteMany({})
  await Order.deleteMany({})
  await ShippingConfig.deleteMany({})
})

describe('Cartiva Admin Fixed Shipping Price & Authoritative Calculation Suite', () => {
  it('loads default fixed shipping rates (NGN 1000, USD 5.99, EUR 5.50, GBP 4.99) when initialized', async () => {
    const config = await shippingConfigService.getShippingConfig()
    expect(config).not.toBeNull()

    const ngnFee = await shippingConfigService.getAuthoritativeShippingFee('NGN')
    expect(ngnFee).toBe(1000)

    const usdFee = await shippingConfigService.getAuthoritativeShippingFee('USD')
    expect(usdFee).toBe(5.99)

    const eurFee = await shippingConfigService.getAuthoritativeShippingFee('EUR')
    expect(eurFee).toBe(5.5)

    const gbpFee = await shippingConfigService.getAuthoritativeShippingFee('GBP')
    expect(gbpFee).toBe(4.99)
  })

  it('allows authorized admin to update shipping rates with full audit log', async () => {
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      username: 'adminshipping',
      email: 'adminshipping@example.com',
      role: 'admin',
    })

    const updated = await shippingConfigService.updateShippingConfig(
      admin._id.toString(),
      { NGN: 1500, USD: 8.99 },
      'Adjusted seasonal shipping rates',
    )

    expect(updated).not.toBeNull()
    const newNgnFee = await shippingConfigService.getAuthoritativeShippingFee('NGN')
    expect(newNgnFee).toBe(1500)

    const newUsdFee = await shippingConfigService.getAuthoritativeShippingFee('USD')
    expect(newUsdFee).toBe(8.99)

    expect(updated.auditLog.length).toBeGreaterThan(0)
    const lastAudit = updated.auditLog[updated.auditLog.length - 1]
    expect(lastAudit.adminEmail).toBe('adminshipping@example.com')
    expect(lastAudit.note).toBe('Adjusted seasonal shipping rates')
  })

  it('strictly rejects non-admin users and invalid numeric values', async () => {
    const buyer = await User.create({
      firstName: 'Normal',
      lastName: 'Buyer',
      username: 'buyeruser',
      email: 'buyeruser@example.com',
      role: 'user',
    })

    // Non-admin rejected
    await expect(
      shippingConfigService.updateShippingConfig(buyer._id.toString(), { NGN: 200 }),
    ).rejects.toThrow('Forbidden: Only authorized administrators can change shipping prices')

    // Invalid negative amount rejected
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Super',
      username: 'superadmin',
      email: 'superadmin@example.com',
      role: 'admin',
    })

    await expect(
      shippingConfigService.updateShippingConfig(admin._id.toString(), { NGN: -500 }),
    ).rejects.toThrow('Invalid shipping rate for NGN: must be a non-negative number')

    // NaN rejected
    await expect(
      shippingConfigService.updateShippingConfig(admin._id.toString(), { NGN: 'invalid' as any }),
    ).rejects.toThrow('Invalid shipping rate for NGN: must be a non-negative number')
  })

  it('enforces immutable order snapshots when admin updates shipping rates later', async () => {
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Rates',
      username: 'adminrates',
      email: 'adminrates@example.com',
      role: 'admin',
    })

    const seller = await User.create({
      firstName: 'Seller',
      lastName: 'Vendor',
      username: 'sellervendor',
      email: 'seller@example.com',
      role: 'seller',
    })

    const buyer = await User.create({
      firstName: 'Buyer',
      lastName: 'Checkout',
      username: 'buyercheckout',
      email: 'buyercheckout@example.com',
      role: 'user',
    })

    const product = await Product.create({
      title: 'Luxury Wireless Headphones',
      description: 'Noise cancelling headphones',
      price: 100.0,
      category: 'Electronics',
      stockQuantity: 50,
      sku: 'SKU-HEADPHONES-1',
      sellerId: seller._id,
    })

    // Initial admin config: USD $5.99
    await shippingConfigService.updateShippingConfig(admin._id.toString(), { USD: 5.99, NGN: 1000 })

    // Buyer creates checkout session with $100.00 product
    const session1 = await Checkout.create({
      userId: buyer._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: 'SKU-HEADPHONES-1',
          quantity: 1,
          itemPrice: 100.0,
          lineTotal: 100.0,
        },
      ],
      shippingAddress: {
        fullName: 'Jane Doe',
        phone: '08012345678',
        country: 'United States',
        state: 'NY',
        city: 'New York',
        street: '10 Wall St',
        postalCode: '10001',
      },
      shippingMethod: 'standard',
      pricing: {
        subtotal: 100.0,
        discountAmount: 0,
        shippingFee: 5.99,
        taxAmount: 0.05,
        grandTotal: 106.04,
      },
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000),
    })

    const { order: order1 } = await orderService.createOrder(buyer._id.toString(), {
      checkoutSessionId: session1._id.toString(),
      paymentMethodType: 'paystack',
      currency: 'USD',
    })

    // Order 1 has $5.99 shipping and $106.04 grand total
    expect(order1.shippingFee).toBe(5.99)
    expect(order1.grandTotal).toBe(106.04)
    expect(toMinorUnits(order1.grandTotal, 'USD')).toBe(10604)

    // Later: Admin increases shipping to USD $12.50
    await shippingConfigService.updateShippingConfig(admin._id.toString(), { USD: 12.5, NGN: 2000 })

    // Existing Order 1 MUST remain completely unchanged!
    const reloadedOrder1 = await Order.findById(order1._id)
    expect(reloadedOrder1?.shippingFee).toBe(5.99)
    expect(reloadedOrder1?.grandTotal).toBe(106.04)

    // New Checkout & Order 2 must use the new active $12.50 rate
    const session2 = await Checkout.create({
      userId: buyer._id,
      items: [
        {
          productId: product._id,
          sellerId: seller._id,
          title: product.title,
          sku: 'SKU-HEADPHONES-1',
          quantity: 1,
          itemPrice: 100.0,
          lineTotal: 100.0,
        },
      ],
      shippingAddress: {
        fullName: 'Jane Doe',
        phone: '08012345678',
        country: 'United States',
        state: 'NY',
        city: 'New York',
        street: '10 Wall St',
        postalCode: '10001',
      },
      shippingMethod: 'standard',
      pricing: {
        subtotal: 100.0,
        discountAmount: 0,
        shippingFee: 12.5,
        taxAmount: 0.05,
        grandTotal: 112.55,
      },
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000),
    })

    const { order: order2 } = await orderService.createOrder(buyer._id.toString(), {
      checkoutSessionId: session2._id.toString(),
      paymentMethodType: 'paystack',
      currency: 'USD',
    })

    expect(order2.shippingFee).toBe(12.5)
    expect(order2.grandTotal).toBe(112.55)
    expect(toMinorUnits(order2.grandTotal, 'USD')).toBe(11255)
  })
})
