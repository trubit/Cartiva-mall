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
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
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
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.CLIENT_URL ?? 'http://localhost:5170',
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
