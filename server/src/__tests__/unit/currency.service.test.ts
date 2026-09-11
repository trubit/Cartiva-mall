import { describe, it, expect } from 'vitest'
import { currencyService } from '../../modules/currency/currency.service.js'

describe('CurrencyService Unit Tests', () => {
  it('returns supported currencies list with metadata', () => {
    const list = currencyService.getSupportedCurrencies()
    expect(list.length).toBeGreaterThanOrEqual(4)

    const codes = list.map((c) => c.code)
    expect(codes).toContain('USD')
    expect(codes).toContain('NGN')
    expect(codes).toContain('EUR')
    expect(codes).toContain('GBP')
  })

  it('fetches exchange rates for USD base', async () => {
    const data = await currencyService.getExchangeRates('USD')
    expect(data.base).toBe('USD')
    expect(data.rates).toBeDefined()
    expect(data.rates.USD).toBe(1.0)
    expect(data.rates.NGN).toBeGreaterThan(0)
    expect(data.rates.EUR).toBeGreaterThan(0)
    expect(data.rates.GBP).toBeGreaterThan(0)
    expect(data.fetchedAt).toBeDefined()
    expect(data.source).toBeDefined()
  })

  it('calculates exchange rate between two currencies', async () => {
    const rateUsdToNgn = await currencyService.getRate('USD', 'NGN')
    expect(rateUsdToNgn).toBeGreaterThan(500)

    const rateSame = await currencyService.getRate('USD', 'USD')
    expect(rateSame).toBe(1.0)

    const rateNgnToUsd = await currencyService.getRate('NGN', 'USD')
    expect(rateNgnToUsd).toBeLessThan(1.0)
    expect(rateNgnToUsd).toBeGreaterThan(0)
  })

  it('converts monetary amount accurately with audit metadata', async () => {
    const result = await currencyService.convert(100, 'USD', 'NGN')
    expect(result.originalAmount).toBe(100)
    expect(result.originalCurrency).toBe('USD')
    expect(result.targetCurrency).toBe('NGN')
    expect(result.targetAmount).toBeGreaterThan(50000)
    expect(result.rate).toBeGreaterThan(500)
    expect(result.formattedOriginal).toBeDefined()
    expect(result.formattedTarget).toBeDefined()
    expect(result.rateTimestamp).toBeDefined()
    expect(result.rateSource).toBeDefined()
  })

  it('rejects invalid or negative amounts safely', async () => {
    await expect(currencyService.convert(-50, 'USD', 'NGN')).rejects.toThrow()
    await expect(currencyService.convert(NaN, 'USD', 'NGN')).rejects.toThrow()
  })
})
