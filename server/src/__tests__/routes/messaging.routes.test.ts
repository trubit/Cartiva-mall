import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'

vi.mock('ioredis', () => {
  class Redis {
    get = vi.fn().mockResolvedValue(null)
    set = vi.fn().mockResolvedValue('OK')
    setex = vi.fn().mockResolvedValue('OK')
    del = vi.fn().mockResolvedValue(1)
    keys = vi.fn().mockResolvedValue([])
    exists = vi.fn().mockResolvedValue(0)
    expire = vi.fn().mockResolvedValue(1)
    sadd = vi.fn().mockResolvedValue(0)
    scan = vi.fn().mockResolvedValue(['0', []])
    incr = vi.fn().mockResolvedValue(1)
    call = vi.fn().mockResolvedValue(null)
    ping = vi.fn().mockResolvedValue('PONG')
    connect = vi.fn().mockResolvedValue(undefined)
    quit = vi.fn().mockResolvedValue('OK')
    on = vi.fn()
    disconnect = vi.fn()
    status = 'ready'
  }
  return { default: Redis, Redis }
})

vi.mock('../../middlewares/rateLimiter.middleware.js', () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next()
  return {
    globalLimiter: pass,
    authLimiter: pass,
    searchLimiter: pass,
    uploadLimiter: pass,
    dashboardLimiter: pass,
    checkoutLimiter: pass,
    paymentLimiter: pass,
    adminLimiter: pass,
    trackLimiter: pass,
    messageLimiter: pass,
  }
})

import app from '../../app.js'
import { API_PREFIX } from '../../../../src/shared/constants/index.js'
import { User } from '../../modules/user/user.model.js'
import { Conversation } from '../../modules/messaging/conversation.model.js'
import { Message } from '../../modules/messaging/message.model.js'
import { Notification } from '../../modules/notification/notification.model.js'
import { signAccessToken } from '../../utils/jwt.js'

const BASE = `${API_PREFIX}/messaging`

let buyerUser: any
let sellerUser: any
let strangerUser: any
let buyerToken: string
let sellerToken: string
let strangerToken: string

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/cartiva_test')
  }

  // Create test users
  buyerUser = await User.create({
    firstName: 'Buyer',
    lastName: 'Tester',
    username: `buyer_${Date.now()}`,
    email: `buyer_${Date.now()}@cartiva.test`,
    password: 'Password123!',
    role: 'user',
    emailVerified: true,
  })

  sellerUser = await User.create({
    firstName: 'Seller',
    lastName: 'Store',
    username: `seller_${Date.now()}`,
    email: `seller_${Date.now()}@cartiva.test`,
    password: 'Password123!',
    role: 'seller',
    emailVerified: true,
  })

  strangerUser = await User.create({
    firstName: 'Stranger',
    lastName: 'User',
    username: `stranger_${Date.now()}`,
    email: `stranger_${Date.now()}@cartiva.test`,
    password: 'Password123!',
    role: 'user',
    emailVerified: true,
  })

  buyerToken = signAccessToken({
    userId: String(buyerUser._id),
    email: buyerUser.email,
    role: buyerUser.role,
  })

  sellerToken = signAccessToken({
    userId: String(sellerUser._id),
    email: sellerUser.email,
    role: sellerUser.role,
  })

  strangerToken = signAccessToken({
    userId: String(strangerUser._id),
    email: strangerUser.email,
    role: strangerUser.role,
  })
})

afterAll(async () => {
  if (buyerUser?._id) await User.findByIdAndDelete(buyerUser._id)
  if (sellerUser?._id) await User.findByIdAndDelete(sellerUser._id)
  if (strangerUser?._id) await User.findByIdAndDelete(strangerUser._id)
  await Conversation.deleteMany({
    participants: { $in: [buyerUser?._id, sellerUser?._id, strangerUser?._id] },
  })
})

describe('Messaging System Integration Tests', () => {
  let testConversationId: string
  let testMessageId: string

  it('rejects starting a conversation without authentication', async () => {
    const res = await request(app)
      .post(`${BASE}/conversations`)
      .send({ recipientId: String(sellerUser._id) })
      .expect(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects messaging oneself', async () => {
    const res = await request(app)
      .post(`${BASE}/conversations`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ recipientId: String(buyerUser._id) })
      .expect(400)
    expect(res.body.success).toBe(false)
  })

  it('allows buyer to start conversation with seller', async () => {
    const res = await request(app)
      .post(`${BASE}/conversations`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipientId: String(sellerUser._id),
        subject: 'Product warranty question',
      })
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data._id).toBeDefined()
    testConversationId = res.body.data._id
  })

  it('lists conversations for authenticated user', async () => {
    const res = await request(app)
      .get(`${BASE}/conversations`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.items).toBeInstanceOf(Array)
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1)
  })

  it('retrieves single conversation by ID for a participant', async () => {
    const res = await request(app)
      .get(`${BASE}/conversations/${testConversationId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data._id).toBe(testConversationId)
  })

  it('denies access to conversation for non-participants', async () => {
    const res = await request(app)
      .get(`${BASE}/conversations/${testConversationId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403)

    expect(res.body.success).toBe(false)
  })

  it('allows buyer to send a message to seller and creates notification', async () => {
    const res = await request(app)
      .post(`${BASE}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        conversationId: testConversationId,
        content: 'Hello! Is this item in stock for fast delivery?',
      })
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data.content).toBe('Hello! Is this item in stock for fast delivery?')
    testMessageId = res.body.data._id

    // Verify recipient unread count was incremented
    const convo = await Conversation.findById(testConversationId)
    expect(convo?.unreadCounts.get(String(sellerUser._id))).toBe(1)
    expect(convo?.lastMessage).toContain('Hello! Is this item in stock')

    // Verify in-app notification was created for seller
    const notif = await Notification.findOne({
      userId: sellerUser._id,
      type: 'message',
    }).sort({ createdAt: -1 })
    expect(notif).toBeDefined()
    expect(notif?.title).toContain('Buyer')
  })

  it('allows seller to fetch messages, marking them as read', async () => {
    const res = await request(app)
      .get(`${BASE}/messages/${testConversationId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1)

    // Verify conversation unread count reset for seller
    const convo = await Conversation.findById(testConversationId)
    expect(convo?.unreadCounts.get(String(sellerUser._id))).toBe(0)
  })

  it('returns unread count summary', async () => {
    const res = await request(app)
      .get(`${BASE}/unread-count`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('unreadConversations')
    expect(res.body.data).toHaveProperty('unreadMessages')
  })

  it('allows sender to edit their own message', async () => {
    const res = await request(app)
      .put(`${BASE}/messages/${testMessageId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: 'Hello! Is this item in stock? (Updated)' })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.content).toBe('Hello! Is this item in stock? (Updated)')
  })

  it('denies non-sender from editing the message', async () => {
    const res = await request(app)
      .put(`${BASE}/messages/${testMessageId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ content: 'Hacked message' })
      .expect(403)

    expect(res.body.success).toBe(false)
  })

  it('allows sender to soft-delete their own message', async () => {
    await request(app)
      .delete(`${BASE}/messages/${testMessageId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(204)

    const msg = await Message.findById(testMessageId)
    expect(msg?.deletedAt).toBeDefined()
  })
})
