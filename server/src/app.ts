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
import financeRoutes from './routes/finance.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import forecastRoutes from './routes/forecast.routes.js'
import workflowRoutes from './routes/workflow.routes.js'
import iamRoutes from './routes/iam.routes.js'
import developerRoutes from './routes/developer.routes.js'
import integrationRoutes from './routes/integration.routes.js'
import apiManagementRoutes from './routes/apiManagement.routes.js'
import eventSystemRoutes from './routes/eventSystem.routes.js'
import searchRoutes from './routes/search.routes.js'
import godmodeRoutes from './routes/godmode.routes.js'
import reviewRoutes from './routes/review.routes.js'
import riskRoutes from './routes/risk.routes.js'
import aiBiRoutes from './routes/aiBi.routes.js'
import currencyRoutes from './routes/currency.routes.js'
import feeRoutes from './routes/fee.routes.js'
import optimizationRoutes from './routes/optimization.routes.js'
import autonomyRoutes from './routes/autonomy.routes.js'
import { apiGatewayMiddleware } from './middlewares/apiGateway.middleware.js'
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
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://js.paystack.co',
          'https://checkout.paystack.com',
          'https://accounts.google.com',
          'https://fonts.googleapis.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        frameSrc: [
          "'self'",
          'https://checkout.paystack.com',
          'https://standard.paystack.co',
          'https://*.paystack.co',
          'https://accounts.google.com',
        ],
        childSrc: [
          "'self'",
          'https://checkout.paystack.com',
          'https://standard.paystack.co',
          'https://*.paystack.co',
        ],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          'https://api.paystack.co',
          'https://checkout.paystack.com',
          'https://standard.paystack.co',
          'https://*.paystack.co',
          'https://accounts.google.com',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
        ],
      },
    },
  }),
)

// ─── Webhooks (raw body BEFORE express.json, AFTER helmet) ───────────────────
app.post(
  [
    '/webhooks/paystack',
    `${API_PREFIX}/payment/paystack/webhook`,
    `${API_PREFIX}/webhooks/paystack`,
  ],
  express.raw({ type: 'application/json', limit: '512kb' }),
  paymentController.paystackWebhook,
)
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json', limit: '512kb' }),
  paymentController.stripeWebhook,
)

// ─── CORS ─────────────────────────────────────────────────────────────────────
if (!env.CLIENT_URL) throw new Error('CLIENT_URL env var is required')
app.use(
  cors({
    origin: env.CLIENT_URL || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
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
  const dbState = mongoose.connection.readyState // 0=disc 1=conn 2=connting 3=discting
  const dbOk = dbState === 1

  const redisOk = await redis
    .ping()
    .then((p) => p === 'PONG')
    .catch(() => false)

  // Always return 200 so wait-server.mjs considers the server "ready" as soon as
  // Express is listening; degraded infra is reported in the body but never blocks dev startup.
  res.status(200).json({
    success: true,
    message: 'Cartiva API is running',
    checks: {
      mongodb: dbOk ? 'ok' : dbState === 2 ? 'connecting' : 'unavailable',
      redis: redisOk ? 'ok' : 'unavailable',
    },
  })
})

// ─── Readiness Check ──────────────────────────────────────────────────────────
app.get('/ready', async (_req, res) => {
  const dbState = mongoose.connection.readyState
  const dbOk = dbState === 1

  const redisOk = await redis
    .ping()
    .then((p) => p === 'PONG')
    .catch(() => false)

  const isReady = dbOk && redisOk

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? 'UP' : 'DOWN',
    message: isReady
      ? 'API Gateway is ready to serve traffic'
      : 'API Gateway dependencies degraded',
    checks: {
      mongodb: dbOk ? 'ok' : 'unavailable',
      redis: redisOk ? 'ok' : 'unavailable',
    },
  })
})

// ─── API Gateway Middleware ───────────────────────────────────────────────────
app.use(API_PREFIX, apiGatewayMiddleware)

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use(`${API_PREFIX}/auth`, authRoutes)
app.use(`${API_PREFIX}/profile`, profileRoutes)
app.use(`${API_PREFIX}/products`, productRoutes)
app.use(`${API_PREFIX}/search`, searchRoutes)
app.use(`${API_PREFIX}/cart`, cartRoutes)
app.use(`${API_PREFIX}/checkout`, checkoutRoutes)
app.use(`${API_PREFIX}/orders`, orderRoutes)
app.use(`${API_PREFIX}/payment`, paymentRoutes)
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes)
app.use(`${API_PREFIX}/seller`, sellerRoutes)
app.use(`${API_PREFIX}/admin`, adminRoutes)
app.use(`${API_PREFIX}/inventory`, inventoryRoutes)
app.use(`${API_PREFIX}/recommendations`, recommendationRoutes)
app.use(`${API_PREFIX}/reviews`, reviewRoutes)
app.use(`${API_PREFIX}/risk`, riskRoutes)
app.use(`${API_PREFIX}/ai-bi`, aiBiRoutes)
app.use(`${API_PREFIX}/optimization`, optimizationRoutes)
app.use(`${API_PREFIX}/autonomy`, autonomyRoutes)
app.get(`${API_PREFIX}/promotions`, getActivePromotions)
app.use(`${API_PREFIX}/notifications`, notificationRoutes)
app.use(`${API_PREFIX}/messaging`, messagingRoutes)
app.use(`${API_PREFIX}/shipments`, shippingRoutes)
app.use(`${API_PREFIX}/returns`, returnsRoutes)
app.use(`${API_PREFIX}/vendor`, vendorRoutes)
app.use(`${API_PREFIX}/vendors`, vendorsRoutes)
app.use(`${API_PREFIX}/finance`, financeRoutes)
app.use(`${API_PREFIX}/analytics`, analyticsRoutes)
app.use(`${API_PREFIX}/forecast`, forecastRoutes)
app.use(`${API_PREFIX}/workflows`, workflowRoutes)
app.use(`${API_PREFIX}/iam`, iamRoutes)
app.use(`${API_PREFIX}/developer`, developerRoutes)
app.use(`${API_PREFIX}/integrations`, integrationRoutes)
app.use(`${API_PREFIX}/api-management`, apiManagementRoutes)
app.use(`${API_PREFIX}/event-system`, eventSystemRoutes)
app.use(`${API_PREFIX}/godmode`, godmodeRoutes)
app.use(`${API_PREFIX}/currencies`, currencyRoutes)
app.use(`${API_PREFIX}/fees`, feeRoutes)

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
