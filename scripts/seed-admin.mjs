import { readFileSync } from 'fs'
import { createRequire } from 'module'

try {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch {}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trusonshopp'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'trustezika831@gmail.com'

const require = createRequire(import.meta.url)
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const User = mongoose.model(
    'User',
    new mongoose.Schema(
      {
        firstName: String,
        lastName: String,
        username: String,
        email: String,
        password: String,
        role: String,
        isActive: Boolean,
        emailVerified: Boolean,
      },
      { strict: false },
    ),
  )

  const hashedPassword = await bcrypt.hash('AdminPassword123!', 12)

  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) {
    existing.role = 'admin'
    existing.isActive = true
    existing.emailVerified = true
    existing.password = hashedPassword
    await existing.save()
    console.log(`Updated admin ${ADMIN_EMAIL} with role=admin and password=AdminPassword123!`)
  } else {
    await User.create({
      firstName: 'Admin',
      lastName: 'Cartiva',
      username: 'cartivaadmin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      emailVerified: true,
    })
    console.log(`Created admin ${ADMIN_EMAIL} with role=admin and password=AdminPassword123!`)
  }

  await mongoose.disconnect()
}

main().catch(console.error)
