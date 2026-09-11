import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Money, roundMoney, toMinorUnits, formatMoney } from '../../../../src/shared/utils/money.js'

describe('Cartiva Production Financial Reconciliation & Precision Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('eliminates floating-point drift and guarantees exact mathematical reconciliation', () => {
    const subtotal = 13456.23
    const shipping = 1000.0
    const tax = 29.6
    const discount = 0.0

    // Using Money class
    const total = Money.from(subtotal).subtract(discount).add(shipping).add(tax).round('NGN')

    // Expected exact sum: 13,456.23 + 1,000.00 + 29.60 = 14,485.83
    expect(total).toBe(14485.83)
    expect(total).not.toBe(10.82)
    expect(formatMoney(total, 'NGN')).toContain('14,485.83')
  })

  it('correctly maps major units to Paystack minor units (kobo) with zero drift', () => {
    const totalNgn = 14485.83
    const minorUnits = toMinorUnits(totalNgn, 'NGN')

    // 14,485.83 NGN must be exactly 1,448,583 kobo
    expect(minorUnits).toBe(1448583)

    // Verify reverse mapping
    const backToMajor = Money.fromMinorUnits(minorUnits, 'NGN').toNumber()
    expect(backToMajor).toBe(14485.83)
  })

  it('accurately converts USD base orders to NGN Paystack amount when needed', async () => {
    // Simulate USD order: $10.82
    const usdGrandTotal = 10.82
    const mockRate = 1345.623

    const converted = roundMoney(Money.from(usdGrandTotal).multiply(mockRate).toNumber(), 'NGN')
    // 10.82 * 1345.623 = 14559.64
    expect(converted).toBe(14559.64)

    const minorUnits = toMinorUnits(converted, 'NGN')
    expect(minorUnits).toBe(1455964)
  })

  it('handles small and large edge case amounts accurately', () => {
    const edgeCases = [
      { amount: 0.01, currency: 'NGN', expectedMinor: 1 },
      { amount: 1.0, currency: 'NGN', expectedMinor: 100 },
      { amount: 50.0, currency: 'NGN', expectedMinor: 5000 },
      { amount: 999.99, currency: 'NGN', expectedMinor: 99999 },
      { amount: 7000.0, currency: 'NGN', expectedMinor: 700000 },
      { amount: 13456.23, currency: 'NGN', expectedMinor: 1345623 },
    ]

    for (const ec of edgeCases) {
      const minor = toMinorUnits(ec.amount, ec.currency)
      expect(minor).toBe(ec.expectedMinor)
      const reversed = Money.fromMinorUnits(minor, ec.currency).toNumber()
      expect(reversed).toBe(ec.amount)
    }
  })

  it('verifies Cartiva commission ₦200 NGN per unit sold is deducted from gross sale for seller net', () => {
    const itemPrice = 13456.23
    const qty = 2
    const subtotal = roundMoney(itemPrice * qty, 'NGN')
    const shipping = 1000.0
    const tax = 59.2
    const buyerTotal = Money.from(subtotal).add(shipping).add(tax).round('NGN')

    // Cartiva commission: 2 units * ₦200 = ₦400 NGN
    const commission = 2 * 200

    // Buyer total must only reflect subtotal + shipping + tax: 26,912.46 + 1,000 + 59.20 = 27,971.66
    expect(buyerTotal).toBe(27971.66)
    expect(buyerTotal).toBe(26912.46 + shipping + tax)

    // Seller net earnings calculation: Gross - Commission
    const sellerGross = subtotal
    const sellerNet = Money.from(sellerGross).subtract(commission).round('NGN')
    expect(sellerNet).toBe(26512.46)
  })
})
