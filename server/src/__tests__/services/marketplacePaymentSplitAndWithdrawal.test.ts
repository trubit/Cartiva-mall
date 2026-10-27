import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { redis } from '../../database/redis.js'
import {
  initializeTransaction,
  verifyTransaction,
  handleWebhook,
} from '../../modules/payment/paystack.service.js'
import {
  recordOrderSellerEarnings,
  reverseOrderSellerEarnings,
  clearCommissionPolicyCache,
} from '../../modules/fee/sellerFee.service.js'
import {
  requestWithdrawal,
  addSellerPayoutAccount,
  getSellerPayoutAccounts,
} from '../../modules/seller/seller.service.js'
import { getFinancialBreakdown } from '../../modules/admin/admin.service.js'
import { SellerProfile } from '../../modules/seller/seller.model.js'
import {
  SellerLedger,
  SellerWithdrawal,
  SellerPayoutAccount,
} from '../../modules/seller/sellerPayout.model.js'
import { SellerFee } from '../../modules/fee/sellerFee.model.js'
import { MarketplaceCommissionPolicy } from '../../modules/fee/marketplaceFee.model.js'
import { Order, type IOrderDocument } from '../../modules/order/order.model.js'
import { Product } from '../../modules/product/product.model.js'
import { Payment } from '../../modules/payment/payment.model.js'
import { User } from '../../modules/user/user.model.js'
import { env } from '../../config/env.js'

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
}

vi.mock('axios', () => ({
  default: {
    get: vi.fn((...args: any[]) => mockAxiosInstance.get(...args)),
    post: vi.fn((...args: any[]) => mockAxiosInstance.post(...args)),
    put: vi.fn((...args: any[]) => mockAxiosInstance.put(...args)),
    delete: vi.fn((...args: any[]) => mockAxiosInstance.delete(...args)),
    create: vi.fn(() => mockAxiosInstance),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

const mockedAxios = mockAxiosInstance as any

describe('Marketplace Payment Split, Fee Accounting, and Seller Withdrawal Suite', () => {
  const sellerAId = new mongoose.Types.ObjectId()
  const sellerBId = new mongoose.Types.ObjectId()
  const buyerId = new mongoose.Types.ObjectId()
  const productAId = new mongoose.Types.ObjectId()
  const productBId = new mongoose.Types.ObjectId()

  const sendWebhook = async (payload: object) => {
    const rawBody = Buffer.from(JSON.stringify(payload))
    const secret = env.PAYSTACK_SECRET_KEY || 'test_secret'
    const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
    return handleWebhook(rawBody, signature)
  }

  beforeAll(() => {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      process.env.PAYSTACK_SECRET_KEY = 'sk_test_ci_mock_secret_key_1234567890'
    }
    if (!process.env.PAYSTACK_PUBLIC_KEY) {
      process.env.PAYSTACK_PUBLIC_KEY = 'pk_test_ci_mock_public_key_1234567890'
    }
    env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
    env.PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_ci_mock_secret_key_1234567890'
    env.PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_ci_mock_public_key_1234567890'
    await clearCommissionPolicyCache()

    // Reset collections
    await Promise.all([
      MarketplaceCommissionPolicy.deleteMany({}),
      SellerProfile.deleteMany({}),
      SellerLedger.deleteMany({}),
      SellerWithdrawal.deleteMany({}),
      SellerPayoutAccount.deleteMany({}),
      SellerFee.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
      Payment.deleteMany({}),
      User.deleteMany({}),
    ])

    // Create Buyer & Sellers
    await Promise.all([
      User.create({
        _id: buyerId,
        username: 'buyer_one',
        firstName: 'Buyer',
        lastName: 'One',
        email: 'buyer@example.com',
        role: 'user',
        password: 'dummypassword123',
      }),
      User.create({
        _id: sellerAId,
        username: 'seller_alpha',
        firstName: 'Seller',
        lastName: 'Alpha',
        email: 'sellerA@example.com',
        role: 'seller',
        password: 'dummypassword123',
      }),
      User.create({
        _id: sellerBId,
        username: 'seller_beta',
        firstName: 'Seller',
        lastName: 'Beta',
        email: 'sellerB@example.com',
        role: 'seller',
        password: 'dummypassword123',
      }),
      SellerProfile.create({
        userId: sellerAId,
        storeName: 'Alpha Tech Store',
        totalSales: 0,
        totalEarnings: 0,
      }),
      SellerProfile.create({
        userId: sellerBId,
        storeName: 'Beta Solar Systems',
        totalSales: 0,
        totalEarnings: 0,
      }),
      Product.create({
        _id: productAId,
        sellerId: sellerAId,
        title: 'Alpha Router',
        description: 'High performance router',
        sku: 'RTR-001',
        price: 15000,
        stockQuantity: 10,
        category: 'Electronics',
      }),
      Product.create({
        _id: productBId,
        sellerId: sellerBId,
        title: 'Beta Solar Controller',
        description: 'Solar charge controller',
        sku: 'SCC-002',
        price: 25000,
        stockQuantity: 10,
        category: 'Electronics',
      }),
    ])
  })

  // ─── Scenario 1 & 2: Single-Seller and Multi-Seller Purchase & Split Initialization ─
  it('correctly calculates single-seller allocation and uses subaccount when available', async () => {
    await SellerPayoutAccount.create({
      sellerId: sellerAId,
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      accountName: 'Alpha Tech Store Ltd',
      subaccountCode: 'ACCT_alpha123sub',
      recipientCode: 'RCP_alpha123',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })

    const order = await Order.create({
      orderNumber: 'ORD-SPLIT-SINGLE-01',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 15000,
      discountAmount: 0,
      shippingFee: 500,
      taxAmount: 0,
      grandTotal: 15500,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 15000,
          lineTotal: 15000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/test-auth-url',
          access_code: 'acc_test123',
          reference: 'TSM-ORD-SPLIT-SINGLE-01',
        },
      },
    } as any)

    const initResult = await initializeTransaction(
      (order as IOrderDocument)._id.toString(),
      buyerId.toString(),
      'buyer@example.com',
    )

    expect(initResult.authorizationUrl).toBe('https://checkout.paystack.com/test-auth-url')
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/transaction/initialize',
      expect.objectContaining({
        subaccount: 'ACCT_alpha123sub',
        bearer: 'account',
      }),
    )

    const payment = await Payment.findOne({ orderId: (order as IOrderDocument)._id })
    expect(payment).toBeDefined()
    expect(payment?.settlementType).toBe('direct_split')
    expect(payment?.subaccountCode).toBe('ACCT_alpha123sub')
  })

  it('correctly handles multi-seller checkout with dynamic split_code or item allocations', async () => {
    await SellerPayoutAccount.create({
      sellerId: sellerAId,
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      accountName: 'Alpha Tech Store Ltd',
      subaccountCode: 'ACCT_sub_alpha',
      recipientCode: 'RCP_sub_alpha',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })
    await SellerPayoutAccount.create({
      sellerId: sellerBId,
      bankName: 'GTBank',
      bankCode: '058',
      accountNumber: '0987654321',
      accountName: 'Beta Solar Systems Ltd',
      subaccountCode: 'ACCT_sub_beta',
      recipientCode: 'RCP_sub_beta',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })

    const order = await Order.create({
      orderNumber: 'ORD-SPLIT-MULTI-02',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 40000,
      discountAmount: 0,
      shippingFee: 1000,
      taxAmount: 0,
      grandTotal: 41000,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 15000,
          lineTotal: 15000,
        },
        {
          productId: productBId,
          sellerId: sellerBId,
          title: 'Beta Solar Controller',
          sku: 'SCC-002',
          quantity: 1,
          itemPrice: 25000,
          lineTotal: 25000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          status: true,
          data: {
            split_code: 'SPL_test_multi_split',
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          status: true,
          data: {
            authorization_url: 'https://checkout.paystack.com/test-multi-url',
            access_code: 'acc_multi_123',
            reference: 'TSM-ORD-SPLIT-MULTI-02',
          },
        },
      } as any)

    const initResult = await initializeTransaction(
      (order as IOrderDocument)._id.toString(),
      buyerId.toString(),
      'buyer@example.com',
    )

    expect(initResult.authorizationUrl).toBe('https://checkout.paystack.com/test-multi-url')
    const payment = await Payment.findOne({ orderId: (order as IOrderDocument)._id })
    expect(payment?.splitCode).toBe('SPL_test_multi_split')
    expect(payment?.sellerBreakdown).toHaveLength(2)
  })

  // ─── Scenario 3 & 4: Separation of Earnings, Platform Commission, and Paystack Fees ─
  it('accurately verifies transaction, extracts actual Paystack fees, and records platform settlement', async () => {
    const order = await Order.create({
      orderNumber: 'ORD-VERIFY-03',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 15000,
      discountAmount: 0,
      shippingFee: 500,
      taxAmount: 0,
      grandTotal: 15500,
      platformCommission: 200,
      sellerEarnings: 14800,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 15000,
          lineTotal: 15000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    const reference = 'REF_TEST_ACTUAL_FEE_03'
    await Payment.create({
      userId: buyerId,
      orderId: (order as IOrderDocument)._id,
      provider: 'paystack',
      paymentIntentId: reference,
      paymentMethod: 'paystack',
      amount: 15500,
      currency: 'NGN',
      status: 'pending',
      refunds: [],
    })

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          status: 'success',
          reference,
          amount: 1550000, // in kobo = 15,500 NGN
          currency: 'NGN',
          fees: 23250, // Paystack fee = 232.50 NGN
          channel: 'card',
        },
      },
    } as any)

    const verification = await verifyTransaction(reference)
    expect(verification.paymentStatus).toBe('paid')

    const payment = await Payment.findOne({ paymentIntentId: reference })
    expect(payment?.status).toBe('completed')
    expect(payment?.paystackFee).toBe(232.5)
    expect(payment?.paystackFeeMinor).toBe(23250)
    expect(payment?.netPlatformSettlement).toBe(15267.5)

    const updatedOrder = await Order.findById((order as IOrderDocument)._id)
    expect(updatedOrder?.paymentStatus).toBe('paid')
    expect(updatedOrder?.paystackFee).toBe(232.5)
    expect(updatedOrder?.platformCommission).toBe(200)
    expect(updatedOrder?.sellerEarnings).toBe(14800)
  })

  // ─── Scenario 5 & 6: Failed / Unverified Payment Guardrails ──────────────────
  it('refuses to mark order as paid or release seller earnings when Paystack status is not success', async () => {
    const order = await Order.create({
      orderNumber: 'ORD-FAIL-04',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 15000,
      discountAmount: 0,
      shippingFee: 500,
      taxAmount: 0,
      grandTotal: 15500,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 15000,
          lineTotal: 15000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    const reference = 'REF_TEST_FAILED_04'
    await Payment.create({
      userId: buyerId,
      orderId: (order as IOrderDocument)._id,
      provider: 'paystack',
      paymentIntentId: reference,
      paymentMethod: 'paystack',
      amount: 15500,
      currency: 'NGN',
      status: 'pending',
      refunds: [],
    })

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          status: 'failed',
          gateway_response: 'Insufficient funds',
          reference,
          amount: 1550000,
          currency: 'NGN',
          fees: 0,
        },
      },
    } as any)

    await expect(verifyTransaction(reference)).rejects.toThrow(/Payment not completed/)

    const orderAfter = await Order.findById((order as IOrderDocument)._id)
    expect(orderAfter?.paymentStatus).toBe('failed')

    const ledger = await SellerLedger.find({ sellerId: sellerAId })
    expect(ledger).toHaveLength(0)
  })

  // ─── Scenario 7 & 8: Duplicate Payment Webhook Idempotency ───────────────────
  it('handles duplicate charge.success webhooks idempotently without double-crediting sellers', async () => {
    const order = await Order.create({
      orderNumber: 'ORD-IDEMP-05',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 15000,
      discountAmount: 0,
      shippingFee: 500,
      taxAmount: 0,
      grandTotal: 15500,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 15000,
          lineTotal: 15000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    const reference = `REF_IDEMP_HOOK_05_${Date.now()}`
    await Payment.create({
      userId: buyerId,
      orderId: (order as IOrderDocument)._id,
      provider: 'paystack',
      paymentIntentId: reference,
      paymentMethod: 'paystack',
      amount: 15500,
      currency: 'NGN',
      status: 'pending',
      refunds: [],
    })

    const webhookEvent = {
      event: 'charge.success',
      data: {
        reference,
        amount: 1550000,
        currency: 'NGN',
        status: 'success',
        fees: 23250,
        metadata: {
          orderId: (order as IOrderDocument)._id.toString(),
        },
      },
    }

    // First webhook delivery
    await sendWebhook(webhookEvent)
    // Duplicate webhook delivery
    await sendWebhook(webhookEvent)

    const ledgerEntries = await SellerLedger.find({
      sellerId: sellerAId,
      referenceId: 'ORD-IDEMP-05',
    })
    expect(ledgerEntries).toHaveLength(1)
    expect(ledgerEntries[0].amount).toBe(15300)

    const profile = await SellerProfile.findOne({ userId: sellerAId })
    expect(profile?.totalSales).toBe(15500)
    expect(profile?.totalEarnings).toBe(15300)
  })

  // ─── Scenario 9, 10, 11: Withdrawal Validations & Concurrency Protection ─────
  it('prevents overdrafts and safely handles simultaneous withdrawal requests via Redis mutex', async () => {
    await Order.create({
      orderNumber: 'ORD-SEED-WITHDRAWAL-01',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      fulfillmentStatus: 'fulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 10000,
      discountAmount: 0,
      shippingFee: 0,
      taxAmount: 0,
      grandTotal: 10000,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 10000,
          lineTotal: 10000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })
    await SellerLedger.create({
      sellerId: sellerAId,
      type: 'ORDER_SALE',
      amount: 10000,
      currency: 'NGN',
      balanceAfter: 10000,
      referenceType: 'order',
      referenceId: 'ORD-SEED-01',
      description: 'Order sale credit',
    })

    const payoutAccount = await SellerPayoutAccount.create({
      sellerId: sellerAId,
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      accountName: 'Alpha Tech Store Ltd',
      recipientCode: 'RCP_test_sellerA',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })

    mockedAxios.post.mockResolvedValue({
      data: {
        status: true,
        data: {
          transfer_code: 'TRF_test_success_123',
          status: 'success',
          reference: 'WTH-REF-01',
        },
      },
    } as any)

    await expect(
      requestWithdrawal(sellerAId.toString(), {
        amount: 15000,
        payoutAccountId: (payoutAccount._id as mongoose.Types.ObjectId).toString(),
      }),
    ).rejects.toThrow(/Insufficient available balance/)

    const redisSpy = vi.spyOn(redis, 'set').mockResolvedValueOnce('OK' as any).mockResolvedValueOnce(null as any)

    const results = await Promise.allSettled([
      requestWithdrawal(sellerAId.toString(), {
        amount: 8000,
        payoutAccountId: (payoutAccount._id as mongoose.Types.ObjectId).toString(),
        idempotencyKey: 'CONCURRENT-KEY-1',
      }),
      requestWithdrawal(sellerAId.toString(), {
        amount: 8000,
        payoutAccountId: (payoutAccount._id as mongoose.Types.ObjectId).toString(),
        idempotencyKey: 'CONCURRENT-KEY-2',
      }),
    ])

    redisSpy.mockRestore()

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)
  })

  // ─── Scenario 12, 13, 14, 15: Transfer Webhooks & Balance Restoration ───────
  it('restores seller balance when Paystack transfer fails or reverses', async () => {
    await Order.create({
      orderNumber: 'ORD-SEED-WITHDRAWAL-02',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      fulfillmentStatus: 'fulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 20000,
      discountAmount: 0,
      shippingFee: 0,
      taxAmount: 0,
      grandTotal: 20000,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 20000,
          lineTotal: 20000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })
    await SellerLedger.create({
      sellerId: sellerAId,
      type: 'ORDER_SALE',
      amount: 20000,
      currency: 'NGN',
      balanceAfter: 20000,
      referenceType: 'order',
      referenceId: 'ORD-SEED-02',
      description: 'Order sale credit',
    })

    const payoutAccount = await SellerPayoutAccount.create({
      sellerId: sellerAId,
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      accountName: 'Alpha Tech Store Ltd',
      recipientCode: 'RCP_test_sellerA',
      currency: 'NGN',
      isDefault: true,
      isVerified: true,
    })

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          transfer_code: 'TRF_test_pending_789',
          status: 'pending',
          reference: 'WTH-REF-FAIL-TEST',
        },
      },
    } as any)

    const withdrawal = await requestWithdrawal(sellerAId.toString(), {
      amount: 10000,
      payoutAccountId: (payoutAccount._id as mongoose.Types.ObjectId).toString(),
    })

    expect(withdrawal.status).toBe('processing')

    await sendWebhook({
      event: 'transfer.failed',
      data: {
        transfer_code: 'TRF_test_pending_789',
        reference: withdrawal.withdrawalNumber,
        status: 'failed',
        reason: 'Destination bank network error',
      },
    })

    const updatedWithdrawal = await SellerWithdrawal.findById(withdrawal._id)
    expect(updatedWithdrawal?.status).toBe('failed')
    expect(updatedWithdrawal?.failureReason).toBe('Destination bank network error')

    const reversalEntry = await SellerLedger.findOne({
      sellerId: sellerAId,
      type: 'WITHDRAWAL_REVERSED',
    })
    expect(reversalEntry).toBeDefined()
    expect(reversalEntry?.amount).toBe(10000)
    expect(reversalEntry?.balanceAfter).toBe(19800)
  })

  // ─── Scenario 16, 17, 18: Refunds & Reversals ──────────────────────────────
  it('deducts earnings via compensating ORDER_REFUND without silent database tampering', async () => {
    const order = await Order.create({
      orderNumber: 'ORD-REF-TEST-06',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      fulfillmentStatus: 'unfulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 15000,
      discountAmount: 0,
      shippingFee: 500,
      taxAmount: 0,
      grandTotal: 15500,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 1,
          itemPrice: 15000,
          lineTotal: 15000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    await recordOrderSellerEarnings(order as IOrderDocument)

    const beforeLedger = await SellerLedger.find({ sellerId: sellerAId })
    expect(beforeLedger).toHaveLength(1)
    expect(beforeLedger[0].balanceAfter).toBe(15300)

    await reverseOrderSellerEarnings(order as IOrderDocument)

    const afterLedger = await SellerLedger.find({ sellerId: sellerAId }).sort({ createdAt: 1 })
    expect(afterLedger).toHaveLength(2)
    expect(afterLedger[1].type).toBe('ORDER_REFUND')
    expect(afterLedger[1].amount).toBe(-15300)
    expect(afterLedger[1].balanceAfter).toBe(0)
  })

  // ─── Scenario 19 & 20: Cross-Seller Security & Bank Masking ──────────────────
  it('masks bank account numbers and strictly isolates seller payout accounts', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          recipient_code: 'RCP_sec_test_01',
        },
      },
    } as any)

    const account = await addSellerPayoutAccount(sellerAId.toString(), {
      bankName: 'Zenith Bank',
      bankCode: '057',
      accountNumber: '2081234567',
      accountName: 'Alpha Secret Corp',
      currency: 'NGN',
      isDefault: true,
    })

    const sellerAccounts = await getSellerPayoutAccounts(sellerAId.toString())
    expect(sellerAccounts[0].accountNumber).toBe('••••4567')

    const sellerBAccounts = await getSellerPayoutAccounts(sellerBId.toString())
    expect(sellerBAccounts).toHaveLength(0)

    await expect(
      requestWithdrawal(sellerBId.toString(), {
        amount: 1000,
        payoutAccountId: (account._id as mongoose.Types.ObjectId).toString(),
      }),
    ).rejects.toThrow(/Payout (bank )?account not found/)
  })

  // ─── Scenario 21, 23, 24: Admin Financial Breakdown & Discrepancy Detection ──
  it('generates authoritative admin financial breakdown and reconciles buyer payments against fees, commissions, and earnings', async () => {
    const order = await Order.create({
      orderNumber: 'ORD-ADMIN-RECON-07',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      fulfillmentStatus: 'fulfilled',
      shippingMethod: 'standard',
      sameAsShipping: true,
      subtotal: 20000,
      discountAmount: 0,
      shippingFee: 0,
      taxAmount: 0,
      grandTotal: 20000,
      sellerEarnings: 19600,
      platformCommission: 400,
      paystackFee: 300,
      history: [],
      items: [
        {
          productId: productAId,
          sellerId: sellerAId,
          title: 'Alpha Router',
          sku: 'RTR-001',
          quantity: 2,
          itemPrice: 10000,
          lineTotal: 20000,
        },
      ],
      shippingAddress: {
        fullName: 'Buyer One',
        phone: '08012345678',
        street: '123 Market Rd',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    })

    await Payment.create({
      userId: buyerId,
      orderId: (order as IOrderDocument)._id,
      provider: 'paystack',
      paymentIntentId: 'REF-ADMIN-007',
      paymentMethod: 'paystack',
      amount: 20300,
      currency: 'NGN',
      status: 'completed',
      paystackFee: 300,
      netPlatformSettlement: 20000,
      refunds: [],
    })

    const breakdown = await getFinancialBreakdown()

    expect(breakdown.verifiedBuyerPayments.total).toBe(20300)
    expect(breakdown.paystackFees.actualRecorded).toBe(300)
    expect(breakdown.sellerEarnings.allocated).toBe(19600)
    expect(breakdown.platformCommission.earned).toBe(400)
    expect(breakdown.reconciliation.discrepancy).toBe(0)
    expect(breakdown.reconciliation.status).toBe('RECONCILED')
  })
})
