import { describe, it, expect, beforeEach } from 'vitest'
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
})
