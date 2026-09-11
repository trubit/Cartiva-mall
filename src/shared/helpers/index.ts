import { DEFAULT_CURRENCY } from '../constants/index.js'
import {
  formatMoney,
  Money,
  moneyAdd,
  moneySub,
  moneyMul,
  moneyDiv,
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
} from '../utils/money.js'
import { SUPPORTED_CURRENCIES, DEFAULT_BASE_CURRENCY } from '../constants/currencies.js'

export const formatCurrency = (
  amount: number,
  fromCurrency = DEFAULT_BASE_CURRENCY,
  targetCurrency?: string,
): string => {
  let to = targetCurrency
  let rates: Record<string, number> = {}

  if (!to && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      const storage = (
        globalThis as unknown as { localStorage?: { getItem: (k: string) => string | null } }
      ).localStorage
      const stored = storage?.getItem('cartiva-currency')
      if (stored) {
        const parsed = JSON.parse(stored)
        const storedCode = parsed?.state?.currentCurrency
        if (typeof storedCode === 'string' && storedCode) {
          to = storedCode
          rates = parsed.state?.rates || {}
        }
      }
    } catch {
      // Ignore localStorage read/parse failures and fall back to default
    }
  }

  const from = (fromCurrency || DEFAULT_BASE_CURRENCY).toUpperCase()
  const target = (to || DEFAULT_CURRENCY).toUpperCase()

  if (from === target || isNaN(amount) || !isFinite(amount)) {
    return formatMoney(roundMoney(amount, target), target)
  }

  const fromRate = rates[from] ?? 1.0
  const toRate = rates[target] ?? 1.0
  const crossRate = toRate / fromRate
  const converted = roundMoney(Money.from(amount).multiply(crossRate).toNumber(), target)
  return formatMoney(converted, target)
}

export {
  formatMoney,
  Money,
  moneyAdd,
  moneySub,
  moneyMul,
  moneyDiv,
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
}

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const hasComponents =
    options &&
    Object.keys(options).some((k) =>
      ['year', 'month', 'day', 'hour', 'minute', 'second', 'weekday', 'era'].includes(k),
    )
  const fmt = hasComponents ? options : { dateStyle: 'medium' as const, ...options }
  return new Intl.DateTimeFormat('en-US', fmt).format(new Date(date))
}

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')

export const truncate = (text: string, length: number): string =>
  text.length > length ? text.slice(0, length) + '...' : text

export const calcDiscountPercent = (price: number, comparePrice: number): number =>
  Math.round(((comparePrice - price) / comparePrice) * 100)

export const buildQueryString = (params: Record<string, unknown>): string => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
  return new URLSearchParams(filtered as Record<string, string>).toString()
}
