import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { redis } from './database/redis.js'
import { env } from './config/env.js'
import { globalLimiter } from './middlewares/rateLimiter.middleware.js'
import { notFound, errorHandler } from './middlewares/error.middleware.js'
import { API_PREFIX } from '../../src/shared/constants/index.js'

import authRoutes from './routes/auth.routes.js'
import profileRoutes from './routes/profile.routes.js'
import productRoutes from './routes/product.routes.js'
import cartRoutes from './routes/cart.routes.js'
import checkoutRoutes from './routes/checkout.routes.js'
import orderRoutes from './routes/order.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import adminRoutes from './routes/admin.routes.js'
import sellerRoutes from './routes/seller.routes.js'
import inventoryRoutes from './routes/inventory.routes.js'
import recommendationRoutes from './routes/recommendation.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import messagingRoutes from './routes/messaging.routes.js'
import shippingRoutes from './routes/shipping.routes.js'
import returnsRoutes from './routes/returns.routes.js'
import vendorRoutes from './routes/vendor.routes.js'
import vendorsRoutes from './routes/vendors.routes.js'
import { getActivePromotions } from './modules/coupon/coupon.controller.js'
import * as paymentController from './modules/payment/payment.controller.js'

const app = express()

// ─── Trust proxy (one hop — nginx/ALB) ───────────────────────────────────────
// Required for express-rate-limit to use the real client IP from X-Forwarded-For
// instead of the proxy's IP, which would collapse all clients into one bucket.
app.set('trust proxy', 1)

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"] },
    },
  }),
)

// ─── Webhooks (raw body BEFORE express.json, AFTER helmet) ───────────────────
app.post(
  '/webhooks/paystack',
  express.raw({ type: 'application/json', limit: '512kb' }),
  paymentController.paystackWebhook,
)

// ─── CORS ─────────────────────────────────────────────────────────────────────
if (!env.CLIENT_URL) throw new Error('CLIENT_URL env var is required')
app.use(
  cors({
    origin: env.CLIENT_URL || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(globalLimiter)

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression())

// ─── Parsing ──────────────────────────────────────────────────────────────────
// 50kb is sufficient for all API payloads; override per-route for bulk uploads
app.use(express.json({ limit: '50kb' }))
app.use(express.urlencoded({ extended: true, limit: '50kb' }))
app.use(cookieParser())

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(env.isDev() ? 'dev' : 'combined'))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbOk = mongoose.connection.readyState === 1

  const redisOk = await redis
    .ping()
    .then((p) => p === 'PONG')
    .catch(() => false)

  const status = dbOk ? 200 : 503
  res.status(status).json({
    success: dbOk,
    message: dbOk ? 'Cartiva API is running' : 'Service degraded',
    checks: {
      mongodb: dbOk ? 'ok' : 'unavailable',
      redis: redisOk ? 'ok' : 'unavailable',
    },
  })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use(`${API_PREFIX}/auth`, authRoutes)
app.use(`${API_PREFIX}/profile`, profileRoutes)
app.use(`${API_PREFIX}/products`, productRoutes)
app.use(`${API_PREFIX}/cart`, cartRoutes)
app.use(`${API_PREFIX}/checkout`, checkoutRoutes)
app.use(`${API_PREFIX}/orders`, orderRoutes)
app.use(`${API_PREFIX}/payment`, paymentRoutes)
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes)
app.use(`${API_PREFIX}/seller`, sellerRoutes)
app.use(`${API_PREFIX}/admin`, adminRoutes)
app.use(`${API_PREFIX}/inventory`, inventoryRoutes)
app.use(`${API_PREFIX}/recommendations`, recommendationRoutes)
app.get(`${API_PREFIX}/promotions`, getActivePromotions)
app.use(`${API_PREFIX}/notifications`, notificationRoutes)
app.use(`${API_PREFIX}/messaging`, messagingRoutes)
app.use(`${API_PREFIX}/shipments`, shippingRoutes)
app.use(`${API_PREFIX}/returns`, returnsRoutes)
app.use(`${API_PREFIX}/vendor`, vendorRoutes)
app.use(`${API_PREFIX}/vendors`, vendorsRoutes)

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
