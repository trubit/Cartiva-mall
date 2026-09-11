import { SUPPORTED_CURRENCIES, DEFAULT_BASE_CURRENCY } from '../constants/currencies.js'

/**
 * Scale factor for internal integer arithmetic to prevent floating point drift.
 * Using 10^6 (6 decimal places) provides sub-cent accounting precision while staying well
 * within JavaScript's Number.MAX_SAFE_INTEGER (up to 9 billion units without precision loss).
 */
const PRECISION_SCALE = 1_000_000

export class Money {
  private readonly scaledValue: bigint

  constructor(amount: number | string | bigint, isAlreadyScaled = false) {
    if (isAlreadyScaled) {
      this.scaledValue = typeof amount === 'bigint' ? amount : BigInt(Math.round(Number(amount)))
    } else {
      const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
      if (isNaN(num) || !isFinite(num)) {
        throw new TypeError(`Invalid monetary amount: ${amount}`)
      }
      // Scale with rounding to eliminate floating point binary representation artifacts
      this.scaledValue = BigInt(Math.round(num * PRECISION_SCALE))
    }
  }

  static from(amount: number | string | Money): Money {
    if (amount instanceof Money) return amount
    return new Money(amount)
  }

  static zero(): Money {
    return new Money(0n, true)
  }

  add(other: number | string | Money): Money {
    const o = Money.from(other)
    return new Money(this.scaledValue + o.scaledValue, true)
  }

  subtract(other: number | string | Money): Money {
    const o = Money.from(other)
    return new Money(this.scaledValue - o.scaledValue, true)
  }

  multiply(factor: number | string): Money {
    const f = typeof factor === 'number' ? factor : parseFloat(String(factor))
    if (isNaN(f) || !isFinite(f)) {
      throw new TypeError(`Invalid multiplication factor: ${factor}`)
    }
    const scaledFactor = BigInt(Math.round(f * 100_000))
    const resultScaled = (this.scaledValue * scaledFactor) / 100_000n
    return new Money(resultScaled, true)
  }

  divide(divisor: number | string): Money {
    const d = typeof divisor === 'number' ? divisor : parseFloat(String(divisor))
    if (isNaN(d) || !isFinite(d) || d === 0) {
      throw new TypeError(`Invalid division divisor: ${divisor}`)
    }
    const scaledDivisor = BigInt(Math.round(d * 100_000))
    const resultScaled = (this.scaledValue * 100_000n) / scaledDivisor
    return new Money(resultScaled, true)
  }

  equals(other: number | string | Money): boolean {
    return this.scaledValue === Money.from(other).scaledValue
  }

  greaterThan(other: number | string | Money): boolean {
    return this.scaledValue > Money.from(other).scaledValue
  }

  greaterThanOrEqual(other: number | string | Money): boolean {
    return this.scaledValue >= Money.from(other).scaledValue
  }

  lessThan(other: number | string | Money): boolean {
    return this.scaledValue < Money.from(other).scaledValue
  }

  lessThanOrEqual(other: number | string | Money): boolean {
    return this.scaledValue <= Money.from(other).scaledValue
  }

  toNumber(): number {
    return Number(this.scaledValue) / PRECISION_SCALE
  }

  /**
   * Rounds this money value to the standard decimal digits of the target currency.
   */
  round(currencyCode: string = DEFAULT_BASE_CURRENCY): number {
    const meta = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()]
    const digits = meta ? meta.decimalDigits : 2
    const factor = Math.pow(10, digits)
    const val = this.toNumber()
    return Math.round((val + Number.EPSILON) * factor) / factor
  }

  /**
   * Converts to integer minor units (e.g. cents/kobo for Stripe/Paystack).
   */
  toMinorUnits(currencyCode: string = DEFAULT_BASE_CURRENCY): number {
    const meta = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()]
    const digits = meta ? meta.decimalDigits : 2
    const factor = Math.pow(10, digits)
    return Math.round(this.toNumber() * factor)
  }

  /**
   * Creates a Money instance from minor units (cents/kobo).
   */
  static fromMinorUnits(minorUnits: number, currencyCode: string = DEFAULT_BASE_CURRENCY): Money {
    const meta = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()]
    const digits = meta ? meta.decimalDigits : 2
    const factor = Math.pow(10, digits)
    return new Money(minorUnits / factor)
  }
}

/**
 * Functional helpers for direct monetary arithmetic without managing classes manually.
 */
export const moneyAdd = (a: number, b: number): number => Money.from(a).add(b).toNumber()
export const moneySub = (a: number, b: number): number => Money.from(a).subtract(b).toNumber()
export const moneyMul = (a: number, factor: number): number =>
  Money.from(a).multiply(factor).toNumber()
export const moneyDiv = (a: number, divisor: number): number =>
  Money.from(a).divide(divisor).toNumber()

export const roundMoney = (
  amount: number,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): number => {
  return Money.from(amount).round(currencyCode)
}

export const toMinorUnits = (
  amount: number,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): number => {
  return Money.from(amount).toMinorUnits(currencyCode)
}

export const fromMinorUnits = (
  minorUnits: number,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): number => {
  return Money.fromMinorUnits(minorUnits, currencyCode).toNumber()
}

/**
 * Formats a monetary number into its locale-aware representation with currency symbol.
 */
export const formatMoney = (
  amount: number,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
  customLocale?: string,
): string => {
  const code = (currencyCode || DEFAULT_BASE_CURRENCY).toUpperCase()
  const meta = SUPPORTED_CURRENCIES[code]
  const locale = customLocale || meta?.locale || 'en-US'
  const digits = meta ? meta.decimalDigits : 2

  const safeRounded = roundMoney(amount, code)

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(safeRounded)
  } catch {
    // Graceful fallback for non-standard locales/runtimes
    const symbol = meta?.symbol ?? code
    const formattedNum = safeRounded.toLocaleString(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return meta?.symbolPosition === 'after'
      ? `${formattedNum}${meta.spaceBetween ? ' ' : ''}${symbol}`
      : `${symbol}${meta?.spaceBetween ? ' ' : ''}${formattedNum}`
  }
}
