import mongoose from 'mongoose'
import { afterAll, beforeAll } from 'vitest'

beforeAll(async () => {
  let uri = process.env['MONGODB_URI']
  if (!uri || uri.includes('trusonshopp')) {
    uri = 'mongodb://127.0.0.1:27017/truson_test'
    process.env['MONGODB_URI'] = uri
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_ci_mock_secret_key_1234567890'
  }
  if (!process.env.PAYSTACK_PUBLIC_KEY) {
    process.env.PAYSTACK_PUBLIC_KEY = 'pk_test_ci_mock_public_key_1234567890'
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri)
  }
})

afterAll(async () => {
  const { collections } = mongoose.connection
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
  await mongoose.connection.close()
})
