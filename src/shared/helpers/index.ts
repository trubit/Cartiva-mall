import { DEFAULT_CURRENCY } from '../constants/index.js'

export const formatCurrency = (amount: number, currency = DEFAULT_CURRENCY): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

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
