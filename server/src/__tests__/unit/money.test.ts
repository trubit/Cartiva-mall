import { describe, it, expect } from 'vitest'
import {
  Money,
  moneyAdd,
  moneySub,
  moneyMul,
  moneyDiv,
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
} from '../../../../src/shared/utils/money.js'

describe('Money Safe Arithmetic & Precision Tests', () => {
  it('prevents classic IEEE-754 floating point arithmetic error (0.1 + 0.2)', () => {
    // Standard JS: 0.1 + 0.2 === 0.30000000000000004
    const res = moneyAdd(0.1, 0.2)
    expect(res).toBe(0.3)
    expect(Money.from(0.1).add(0.2).toNumber()).toBe(0.3)
  })

  it('handles subtraction accurately without floating point artifacts', () => {
    // Standard JS: 1.0 - 0.9 === 0.09999999999999998
    const res = moneySub(1.0, 0.9)
    expect(res).toBe(0.1)
  })

  it('handles multiplication with high precision scaling', () => {
    const res = moneyMul(19.99, 3)
    expect(res).toBe(59.97)
  })

  it('handles division safely', () => {
    const res = moneyDiv(100, 3)
    expect(roundMoney(res, 'USD')).toBe(33.33)
  })

  it('handles difficult and boundary values accurately', () => {
    const values = [0.01, 0.1, 0.99, 1.01, 999.99, 999999.99, 1000000]
    for (const val of values) {
      const m = Money.from(val)
      expect(m.toNumber()).toBe(val)
      expect(m.round('USD')).toBe(val)
    }
  })

  it('correctly rounds half-up boundary cases (1.005, 10.555, 99.999)', () => {
    expect(roundMoney(1.005, 'USD')).toBe(1.01)
    expect(roundMoney(10.555, 'USD')).toBe(10.56)
    expect(roundMoney(99.999, 'USD')).toBe(100.0)
    expect(roundMoney(1234.564, 'USD')).toBe(1234.56)
  })

  it('handles 0-decimal currencies like JPY', () => {
    expect(roundMoney(154.6, 'JPY')).toBe(155)
    expect(roundMoney(154.2, 'JPY')).toBe(154)
    expect(toMinorUnits(150, 'JPY')).toBe(150)
    expect(fromMinorUnits(150, 'JPY')).toBe(150)
  })

  it('converts to and from integer minor units (cents/kobo)', () => {
    expect(toMinorUnits(10.5, 'USD')).toBe(1050)
    expect(fromMinorUnits(1050, 'USD')).toBe(10.5)

    expect(toMinorUnits(250000.75, 'NGN')).toBe(25000075)
    expect(fromMinorUnits(25000075, 'NGN')).toBe(250000.75)
  })

  it('formats currencies according to locale and symbol rules', () => {
    const usdFmt = formatMoney(1250.5, 'USD')
    expect(usdFmt).toContain('1,250.50')

    const ngnFmt = formatMoney(250000, 'NGN')
    expect(ngnFmt).toContain('250,000.00')

    const eurFmt = formatMoney(99.9, 'EUR')
    expect(eurFmt).toMatch(/99[.,]90/)

    const gbpFmt = formatMoney(75.25, 'GBP')
    expect(gbpFmt).toContain('75.25')
  })

  it('performs comparisons correctly', () => {
    const a = Money.from(10.5)
    const b = Money.from(10.5)
    const c = Money.from(12.0)

    expect(a.equals(b)).toBe(true)
    expect(c.greaterThan(a)).toBe(true)
    expect(a.lessThan(c)).toBe(true)
    expect(a.greaterThanOrEqual(b)).toBe(true)
  })
})
