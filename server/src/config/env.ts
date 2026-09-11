import dotenv from 'dotenv'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5170',
  MONGODB_URI: required('MONGODB_URI'),
  REDIS_HOST: process.env.REDIS_HOST ?? '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? '',
  REDIS_TLS_ENABLED: process.env.REDIS_TLS_ENABLED === 'true',
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_PREVIOUS_SECRET: process.env.JWT_PREVIOUS_SECRET ?? '',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:5000',
  CART_SERVICE_URL: process.env.CART_SERVICE_URL ?? 'http://localhost:5000',
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL ?? 'http://localhost:5000',
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:5000',
  INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:5000',
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? 'http://localhost:5000',
  FINANCE_SERVICE_URL: process.env.FINANCE_SERVICE_URL ?? 'http://localhost:5000',
  LOGISTICS_SERVICE_URL: process.env.LOGISTICS_SERVICE_URL ?? 'http://localhost:5000',
  EMAIL_HOST: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT ?? '587', 10),
  EMAIL_USER: process.env.EMAIL_USER ?? '',
  EMAIL_PASS: process.env.EMAIL_PASS ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'Cartiva <noreply@cartiva.com>',
  BREVO_API_KEY: process.env.BREVO_API_KEY ?? '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ?? '',
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ?? '',
  PAYSTACK_CURRENCY: process.env.PAYSTACK_CURRENCY ?? 'NGN',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  STRIPE_CURRENCY: process.env.STRIPE_CURRENCY ?? 'USD',
  SMS_PROVIDER_API_KEY: process.env.SMS_PROVIDER_API_KEY ?? process.env.TERMII_API_KEY ?? '',
  SMS_FROM: process.env.SMS_FROM ?? process.env.TERMII_SENDER_ID ?? 'Cartiva',
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.CLIENT_URL ?? 'http://localhost:5170',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '',
  isDev(): boolean {
    return this.NODE_ENV === 'development'
  },
  isProd(): boolean {
    return this.NODE_ENV === 'production'
  },
}

export const validateEnv = (): void => {
  if (env.NODE_ENV !== 'production') return
  const productionRequired: Array<keyof typeof env> = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'BREVO_API_KEY',
    'CLIENT_URL',
  ]
  const missing = productionRequired.filter((k) => !env[k])
  if (missing.length > 0) {
    throw new Error(`Missing required production env vars: ${missing.join(', ')}`)
  }
}
