import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  getCommissionPolicy,
  updateCommissionPolicy,
  getCartivaCommissionPerUnit,
  clearCommissionPolicyCache,
} from '../../modules/fee/sellerFee.service.js'
import { MarketplaceCommissionPolicy } from '../../modules/fee/marketplaceFee.model.js'
import { User } from '../../modules/user/user.model.js'

describe('Marketplace Commission Dynamic Policy Unit Tests', () => {
  let adminUser: any

  beforeEach(async () => {
    await clearCommissionPolicyCache()
    await MarketplaceCommissionPolicy.deleteMany({})
    await User.deleteMany({ email: 'testadmin-fee@cartiva.mall' })

    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Super',
      username: 'testadminfee',
      email: 'testadmin-fee@cartiva.mall',
      password: 'HashPassword123!',
      role: 'admin',
    })
  })

  it('automatically seeds baseline commission policy if none exists', async () => {
    const policy = await getCommissionPolicy()
    expect(policy).toBeDefined()
    expect(policy.baseSellerFee).toBe(200)
    expect(policy.baseCurrency).toBe('NGN')
    expect(policy.isActive).toBe(true)
    expect(policy.version).toBe(1)
  })

  it('retrieves accurate per-unit commission dynamically for configured currencies', async () => {
    const ngnRate = await getCartivaCommissionPerUnit('NGN')
    expect(ngnRate).toBe(200)

    const usdRate = await getCartivaCommissionPerUnit('USD')
    expect(usdRate).toBe(0.15)
  })

  it('dynamically updates seller fee and records audit history', async () => {
    const updated = await updateCommissionPolicy(adminUser._id.toString(), {
      baseSellerFee: 500,
      baseCurrency: 'NGN',
      currencyRates: {
        NGN: 500,
        USD: 0.35,
      },
      reason: 'Mid-year seller fee update',
    })

    expect(updated.baseSellerFee).toBe(500)
    expect(updated.version).toBe(2)
    expect(updated.auditTrail.length).toBeGreaterThan(0)
    expect(updated.auditTrail[updated.auditTrail.length - 1]?.reason).toBe(
      'Mid-year seller fee update',
    )

    // Immediate dynamic reflection without server restart
    const newNgnRate = await getCartivaCommissionPerUnit('NGN')
    expect(newNgnRate).toBe(500)

    const newUsdRate = await getCartivaCommissionPerUnit('USD')
    expect(newUsdRate).toBe(0.35)
  })

  it('rejects negative fees and invalid inputs with validation error', async () => {
    await expect(
      updateCommissionPolicy(adminUser._id.toString(), {
        baseSellerFee: -50,
      }),
    ).rejects.toThrow('Base seller fee cannot be negative')
  })

  it('permanently persists updated commission policy across cache evictions without reverting to baseline seed', async () => {
    // 1. Initial seed should be 200
    const initial = await getCommissionPolicy()
    expect(initial.baseSellerFee).toBe(200)

    // 2. Update to 750
    const updated = await updateCommissionPolicy(adminUser._id.toString(), {
      baseSellerFee: 750,
      baseCurrency: 'NGN',
      reason: 'Permanent board approved adjustment',
    })
    expect(updated.baseSellerFee).toBe(750)
    expect(updated.version).toBe(2)

    // 3. Simulate total cache eviction / process restart
    await clearCommissionPolicyCache()

    // 4. Fetch policy again from database
    const persisted = await getCommissionPolicy()
    expect(persisted.baseSellerFee).toBe(750)
    expect(persisted.version).toBe(2)
    expect(persisted.auditTrail.slice(-1)[0]?.reason).toBe('Permanent board approved adjustment')

    // 5. Ensure commission calculation reflects the 750 fee
    const perUnit = await getCartivaCommissionPerUnit('NGN')
    expect(perUnit).toBe(750)
  })

  afterAll(async () => {
    await MarketplaceCommissionPolicy.deleteMany({})
    await clearCommissionPolicyCache()
  })
})
