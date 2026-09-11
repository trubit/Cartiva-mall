import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import mongoose from 'mongoose'
import {
  recordOrderSellerEarnings,
  clearCommissionPolicyCache,
} from '../../modules/fee/sellerFee.service.js'
import { MarketplaceCommissionPolicy } from '../../modules/fee/marketplaceFee.model.js'
import { messagingService } from '../../modules/messaging/messaging.service.js'
import { Conversation } from '../../modules/messaging/conversation.model.js'
import { Message } from '../../modules/messaging/message.model.js'
import { User } from '../../modules/user/user.model.js'
import { SellerProfile } from '../../modules/seller/seller.model.js'
import { SellerLedger } from '../../modules/seller/sellerPayout.model.js'
import { Notification } from '../../modules/notification/notification.model.js'
import { SMSProvider } from '../../modules/notification/providers/smsProvider.js'
import * as emailUtils from '../../utils/email.js'
import * as socketUtils from '../../sockets/index.js'
import type { IOrderDocument } from '../../modules/order/order.model.js'

describe('Seller Order Notifications & Real-Time Messaging Suite', () => {
  let sellerAId: mongoose.Types.ObjectId
  let sellerBId: mongoose.Types.ObjectId
  let buyerId: mongoose.Types.ObjectId
  let strangerId: mongoose.Types.ObjectId

  let emailSpy: any
  let smsSpy: any
  let socketSpy: any

  beforeEach(async () => {
    await clearCommissionPolicyCache()
    // Clear test collections
    await Promise.all([
      User.deleteMany({}),
      SellerProfile.deleteMany({}),
      SellerLedger.deleteMany({}),
      Notification.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      MarketplaceCommissionPolicy.deleteMany({}),
    ])

    sellerAId = new mongoose.Types.ObjectId()
    sellerBId = new mongoose.Types.ObjectId()
    buyerId = new mongoose.Types.ObjectId()
    strangerId = new mongoose.Types.ObjectId()

    // Create Seller A User & Profile
    await User.create({
      _id: sellerAId,
      username: 'aliceseller',
      firstName: 'Alice',
      lastName: 'Seller',
      email: 'alice@seller.com',
      password: 'HashedPassword123!',
      role: 'seller',
      phoneNumber: '+2348011111111',
    })
    await SellerProfile.create({
      userId: sellerAId,
      storeName: 'Alice Tech Store',
      whatsappNumber: '+2348011111111',
      storeAddress: {
        street: '10 Tech Ave',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        postalCode: '100001',
      },
    })

    // Create Seller B User & Profile
    await User.create({
      _id: sellerBId,
      username: 'bobvendor',
      firstName: 'Bob',
      lastName: 'Vendor',
      email: 'bob@vendor.com',
      password: 'HashedPassword123!',
      role: 'seller',
      phoneNumber: '+2348022222222',
    })
    await SellerProfile.create({
      userId: sellerBId,
      storeName: 'Bob Fashion Hub',
      whatsappNumber: '+2348022222222',
      storeAddress: {
        street: '20 Fashion Rd',
        city: 'Abuja',
        state: 'FCT',
        country: 'NG',
        postalCode: '900001',
      },
    })

    // Create Buyer & Stranger
    await User.create({
      _id: buyerId,
      username: 'charliebuyer',
      firstName: 'Charlie',
      lastName: 'Buyer',
      email: 'charlie@buyer.com',
      password: 'HashedPassword123!',
      role: 'user',
    })
    await User.create({
      _id: strangerId,
      username: 'evestranger',
      firstName: 'Eve',
      lastName: 'Stranger',
      email: 'eve@stranger.com',
      password: 'HashedPassword123!',
      role: 'user',
    })

    // Spy on email, SMS, and socket delivery
    emailSpy = vi
      .spyOn(emailUtils, 'sendSellerOrderNotificationEmail')
      .mockResolvedValue(undefined as any)
    smsSpy = vi
      .spyOn(SMSProvider, 'send')
      .mockResolvedValue({ messageId: 'test_sms_123', success: true })
    socketSpy = vi.spyOn(socketUtils, 'emitToUser').mockImplementation(() => true as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dispatches multi-channel isolated notifications (In-App, Socket, Email, SMS) per seller on paid order', async () => {
    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'TSM-2026-NOTIF-01',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sellerId: sellerAId,
          title: 'Laptop Pro 16',
          itemPrice: 50000,
          quantity: 2,
          lineTotal: 100000,
        },
        {
          productId: new mongoose.Types.ObjectId(),
          sellerId: sellerBId,
          title: 'Designer Sunglasses',
          itemPrice: 15000,
          quantity: 1,
          lineTotal: 15000,
        },
      ],
    } as unknown as IOrderDocument

    await recordOrderSellerEarnings(mockOrder)

    // Verify In-App Notifications in Database
    const notifA = await Notification.findOne({ userId: sellerAId })
    expect(notifA).toBeDefined()
    expect(notifA?.title).toBe('New Paid Order Received!')
    expect(notifA?.message).toContain('Laptop Pro 16')
    expect(notifA?.message).not.toContain('Designer Sunglasses') // Strict multi-seller isolation!
    expect(notifA?.data?.orderNumber).toBe('TSM-2026-NOTIF-01')

    const notifB = await Notification.findOne({ userId: sellerBId })
    expect(notifB).toBeDefined()
    expect(notifB?.message).toContain('Designer Sunglasses')
    expect(notifB?.message).not.toContain('Laptop Pro 16') // Strict multi-seller isolation!

    // Verify Real-time Socket.IO Events
    expect(socketSpy).toHaveBeenCalledWith(
      sellerAId.toString(),
      'order:new',
      expect.objectContaining({
        orderNumber: 'TSM-2026-NOTIF-01',
      }),
    )
    expect(socketSpy).toHaveBeenCalledWith(
      sellerBId.toString(),
      'order:new',
      expect.objectContaining({
        orderNumber: 'TSM-2026-NOTIF-01',
      }),
    )

    // Verify Transactional Email Delivery per Seller
    expect(emailSpy).toHaveBeenCalledWith(
      'alice@seller.com',
      'Alice Seller',
      'TSM-2026-NOTIF-01',
      'NGN',
      expect.arrayContaining([expect.objectContaining({ title: 'Laptop Pro 16', quantity: 2 })]),
      100000,
      400, // ₦200 * 2 units
      99600, // 100000 - 400
    )

    expect(emailSpy).toHaveBeenCalledWith(
      'bob@vendor.com',
      'Bob Vendor',
      'TSM-2026-NOTIF-01',
      'NGN',
      expect.arrayContaining([
        expect.objectContaining({ title: 'Designer Sunglasses', quantity: 1 }),
      ]),
      15000,
      200, // ₦200 * 1 unit
      14800, // 15000 - 200
    )

    // Verify SMS Dispatch with authenticated seller phone numbers
    expect(smsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+2348011111111',
        message: expect.stringContaining('TSM-2026-NOTIF-01'),
      }),
    )
    expect(smsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+2348022222222',
        message: expect.stringContaining('TSM-2026-NOTIF-01'),
      }),
    )
  })

  it('guarantees idempotency — duplicate webhook confirmations do not re-send notifications', async () => {
    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'TSM-2026-IDEMP-01',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sellerId: sellerAId,
          title: 'Mechanical Keyboard',
          itemPrice: 25000,
          quantity: 1,
          lineTotal: 25000,
        },
      ],
    } as unknown as IOrderDocument

    // First call
    await recordOrderSellerEarnings(mockOrder)
    expect(emailSpy).toHaveBeenCalledTimes(1)
    expect(smsSpy).toHaveBeenCalledTimes(1)

    const notifCount1 = await Notification.countDocuments({ userId: sellerAId, type: 'order' })
    expect(notifCount1).toBe(1)

    // Second call (simulating webhook retry)
    await recordOrderSellerEarnings(mockOrder)

    // Must NOT send duplicate emails, SMS, or in-app notifications
    expect(emailSpy).toHaveBeenCalledTimes(1)
    expect(smsSpy).toHaveBeenCalledTimes(1)
    const notifCount2 = await Notification.countDocuments({ userId: sellerAId, type: 'order' })
    expect(notifCount2).toBe(1)
  })

  it('handles email or SMS delivery failure gracefully without rolling back order or ledger', async () => {
    emailSpy.mockRejectedValueOnce(new Error('Brevo service 503 unavailable'))
    smsSpy.mockRejectedValueOnce(new Error('SMS Gateway timeout'))

    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'TSM-2026-FAILSAFE-01',
      userId: buyerId,
      currency: 'NGN',
      paymentStatus: 'paid',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sellerId: sellerAId,
          title: 'Resilient Router',
          itemPrice: 30000,
          quantity: 1,
          lineTotal: 30000,
        },
      ],
    } as unknown as IOrderDocument

    // Does not throw
    await expect(recordOrderSellerEarnings(mockOrder)).resolves.not.toThrow()

    // In-App Notification and Ledger must succeed
    const ledger = await SellerLedger.findOne({
      sellerId: sellerAId,
      referenceId: 'TSM-2026-FAILSAFE-01',
    })
    expect(ledger).toBeDefined()
    expect(ledger?.amount).toBe(29800) // 30000 - 200

    const notif = await Notification.findOne({ userId: sellerAId })
    expect(notif).toBeDefined()
  })

  it('provides secure buyer-seller messaging with IDOR protection and real-time synchronization', async () => {
    // 1. Buyer starts conversation with Seller A
    const convo = await messagingService.getOrCreateConversation(
      buyerId.toString(),
      sellerAId.toString(),
      {
        subject: 'Inquiry about Laptop Pro',
      },
    )
    expect(convo).toBeDefined()
    expect(convo._id).toBeDefined()

    // 2. Buyer sends message
    const msg1 = await messagingService.sendMessage(
      convo._id.toString(),
      buyerId.toString(),
      'Hello, does this come with a warranty?',
    )
    expect(msg1.content).toBe('Hello, does this come with a warranty?')

    // 3. Verify unread count and real-time delivery to Seller A
    const sellerConvos = await messagingService.listConversations(sellerAId.toString())
    expect(sellerConvos.items.length).toBe(1)
    expect(sellerConvos.unreadTotal).toBe(1)

    // 4. Seller reads messages
    const sellerMessages = await messagingService.getMessages(
      convo._id.toString(),
      sellerAId.toString(),
    )
    expect(sellerMessages.items.length).toBe(1)

    // 5. Seller replies
    const msg2 = await messagingService.sendMessage(
      convo._id.toString(),
      sellerAId.toString(),
      'Yes, 1-year official warranty included!',
    )
    expect(msg2.content).toBe('Yes, 1-year official warranty included!')

    // 6. IDOR Protection: Stranger is denied access
    await expect(
      messagingService.getMessages(convo._id.toString(), strangerId.toString()),
    ).rejects.toThrow('Access denied')

    await expect(
      messagingService.sendMessage(convo._id.toString(), strangerId.toString(), 'Intruder message'),
    ).rejects.toThrow('Access denied')
  })
})
