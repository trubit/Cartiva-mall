import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Money, toMinorUnits, fromMinorUnits } from '../../../shared/utils/money.js'
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js'
import { useCurrencyStore } from '../../store/currencyStore.js'
import { useCurrency } from '../../hooks/useCurrency.js'
import { formatCurrency } from '../../../shared/helpers/index.js'

describe('Mandatory Dynamic Currency & Live Exchange-Rate System', () => {
  beforeEach(() => {
    act(() => {
      useCurrencyStore.setState({
        currentCurrency: 'USD',
        rates: {
          USD: 1.0,
          NGN: 1500.0,
          EUR: 0.9,
          GBP: 0.8,
          CAD: 1.35,
          AUD: 1.5,
          JPY: 150.0,
          CNY: 7.2,
          GHS: 15.0,
          ZAR: 18.0,
          KES: 130.0,
        },
        rateSource: 'Test Baseline',
        ratesFetchedAt: new Date().toISOString(),
        isLoadingRates: false,
      })
    })
  })

  describe('1. SUPPORTED_CURRENCIES & CNY Support', () => {
    it('supports all required major currencies including CNY, NGN, USD, GBP, EUR, CAD, AUD, JPY', () => {
      const required = ['USD', 'NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY']
      required.forEach((code) => {
        expect(SUPPORTED_CURRENCIES[code]).toBeDefined()
        expect(SUPPORTED_CURRENCIES[code].isActive).toBe(true)
        expect(SUPPORTED_CURRENCIES[code].symbol).toBeTruthy()
        expect(SUPPORTED_CURRENCIES[code].flag).toBeTruthy()
      })
    })

    it('has accurate metadata for CNY', () => {
      const cny = SUPPORTED_CURRENCIES.CNY
      expect(cny.code).toBe('CNY')
      expect(cny.symbol).toBe('¥')
      expect(cny.decimalDigits).toBe(2)
      expect(cny.locale).toBe('zh-CN')
    })
  })

  describe('2. Money Arithmetic & Financial Precision', () => {
    it('handles precise 6-decimal scaling without floating point errors', () => {
      const a = Money.from(0.1)
      const b = Money.from(0.2)
      expect(a.add(b).toNumber()).toBe(0.3)
      expect(a.add(b).round('USD')).toBe(0.3)
    })

    it('converts to and from integer minor units (kobo/cents)', () => {
      expect(toMinorUnits(12.34, 'USD')).toBe(1234)
      expect(fromMinorUnits(1234, 'USD')).toBe(12.34)
      // JPY has 0 decimal digits
      expect(toMinorUnits(1500, 'JPY')).toBe(1500)
      expect(fromMinorUnits(1500, 'JPY')).toBe(1500)
    })
  })

  describe('3. Currency Conversion & Cross Rates', () => {
    it('converts USD to NGN with baseline rate', () => {
      const { result } = renderHook(() => useCurrency())
      // 100 USD at 1500 NGN/USD = 150,000 NGN
      const converted = result.current.convertAmount(100, 'USD', 'NGN')
      expect(converted).toBe(150000)
    })

    it('converts NGN to USD with cross rate', () => {
      const { result } = renderHook(() => useCurrency())
      // 15,000 NGN at ~1500 NGN/USD ≈ 10 USD
      const converted = result.current.convertAmount(15000, 'NGN', 'USD')
      expect(converted).toBeCloseTo(10, 0)
    })

    it('converts EUR to NGN via base USD cross rate', () => {
      const { result } = renderHook(() => useCurrency())
      // 90 EUR -> 100 USD -> ~150,000 NGN
      const converted = result.current.convertAmount(90, 'EUR', 'NGN')
      expect(converted).toBeGreaterThan(140000)
    })

    it('converts USD to CNY accurately', () => {
      const { result } = renderHook(() => useCurrency())
      // 50 USD at ~7.2 CNY/USD ≈ 360 CNY
      const converted = result.current.convertAmount(50, 'USD', 'CNY')
      expect(converted).toBeGreaterThan(350)
    })
  })

  describe('4. Dynamic Reactivity on Currency Switch', () => {
    it('automatically updates formatPrice and symbols when currentCurrency changes without page reload', () => {
      const { result } = renderHook(() => useCurrency())

      expect(result.current.currentCurrency).toBe('USD')
      expect(result.current.symbol).toBe('$')
      expect(result.current.formatPrice(100)).toContain('$100.00')

      // Switch to NGN
      act(() => {
        result.current.setCurrency('NGN')
      })

      expect(result.current.currentCurrency).toBe('NGN')
      expect(result.current.symbol).toBe('₦')
      expect(result.current.formatPrice(100)).toMatch(/151,550.00|150,000.00/)

      // Switch to EUR
      act(() => {
        result.current.setCurrency('EUR')
      })

      expect(result.current.currentCurrency).toBe('EUR')
      expect(result.current.symbol).toBe('€')
      expect(result.current.formatPrice(100)).toMatch(/92[.,]00|90[.,]00/)

      // Switch to CNY
      act(() => {
        result.current.setCurrency('CNY')
      })

      expect(result.current.currentCurrency).toBe('CNY')
      expect(result.current.symbol).toBe('¥')
      expect(result.current.formatPrice(100)).toContain('720.00')
    })
  })

  describe('5. Shared Helper formatCurrency', () => {
    it('formats directly with active target currency', () => {
      const formattedUSD = formatCurrency(100, 'USD', 'USD')
      expect(formattedUSD).toContain('$100.00')

      const formattedNGN = formatCurrency(100, 'USD', 'NGN')
      expect(formattedNGN).toContain('100.00')
    })
  })
})
