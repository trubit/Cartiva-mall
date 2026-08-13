import { env } from '../config/env.js'

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  ...(env.REDIS_TLS_ENABLED ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
} as const
