/**
 * One-time script — promotes a user to admin role.
 * Run: node scripts/make-admin.mjs
 *
 * Reads MONGODB_URI from .env automatically.
 */
import { readFileSync } from 'fs'
import { createRequire } from 'module'

// Load .env manually (no dotenv dependency needed)
try {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  console.warn('Could not read .env — falling back to environment variables')
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trusonshopp'
const ADMIN_EMAIL = 'trustezika831@gmail.com'

const require = createRequire(import.meta.url)
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  isActive: Boolean,
  emailVerified: Boolean,
})
const User = mongoose.model('User', userSchema)

async function main() {
  console.log(`Connecting to ${MONGODB_URI} …`)
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { $set: { role: 'admin', isActive: true, emailVerified: true } },
    { new: true },
  )

  if (!result) {
    console.error(`❌  No user found with email ${ADMIN_EMAIL}`)
    console.error('   Register that account first via /register, then re-run this script.')
  } else {
    console.log(`✅  ${ADMIN_EMAIL} is now role=admin (isActive=true, emailVerified=true)`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})
