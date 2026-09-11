import { cacheGet, cacheSet } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middlewares/error.middleware.js'
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  type ICurrencyMetadata,
} from '../../../../src/shared/constants/currencies.js'
import { Money, formatMoney, roundMoney } from '../../../../src/shared/utils/money.js'
import type {
  IExchangeRatesResponse,
  ICurrencyConversionResult,
} from '../../../../src/shared/types/currency.types.js'

const CACHE_TTL_SECONDS = parseInt(process.env.EXCHANGE_RATE_CACHE_TTL ?? '3600', 10)

/**
 * Authoritative Central Bank Baseline Rates for USD base.
 * Used as fallback ONLY when live external API requests fail or in offline/test environments.
 */
const BASELINE_RATES_USD: Record<string, number> = {
  USD: 1.0,
  NGN: 1515.5,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 154.2,
  CNY: 7.24,
  GHS: 15.4,
  ZAR: 18.25,
  KES: 130.5,
}

class CurrencyService {
  /**
   * Fetches latest exchange rates from live provider or cached Redis key.
   */
  async getExchangeRates(baseCurrency = DEFAULT_BASE_CURRENCY): Promise<IExchangeRatesResponse> {
    const base = (baseCurrency || DEFAULT_BASE_CURRENCY).toUpperCase()
    const cacheKey = `currency:rates:${base}`

    // 1. Try Cache
    try {
      const cached = await cacheGet<IExchangeRatesResponse>(cacheKey)
      if (cached && cached.rates && Object.keys(cached.rates).length > 0) {
        return cached
      }
    } catch (err) {
      logger.debug('Cache lookup skipped for exchange rates', { err })
    }

    // 2. Fetch from Live Public Exchange Rate Providers
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      // Provider 1: Open Exchange Rates public feed
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CartivaMarketplace/1.0' },
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = (await response.json()) as {
          result?: string
          rates?: Record<string, number>
          time_last_update_utc?: string
        }

        if (data.result === 'success' && data.rates) {
          const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString()
          const result: IExchangeRatesResponse = {
            base,
            rates: data.rates,
            fetchedAt: new Date().toISOString(),
            expiresAt,
            source: 'open.er-api.com (Live Market Feed)',
            isFallback: false,
          }

          await cacheSet(cacheKey, result, CACHE_TTL_SECONDS).catch(() => {})
          logger.info(`Live exchange rates updated successfully for ${base}`)
          return result
        }
      }
    } catch (fetchErr) {
      logger.warn('Primary exchange rate provider unavailable, attempting secondary feed', {
        err: (fetchErr as Error).message,
      })
    }

    // Provider 2: Frankfurter ECB feed
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = (await res.json()) as { rates?: Record<string, number> }
        if (data.rates) {
          const ratesWithBase = { ...BASELINE_RATES_USD, ...data.rates, [base]: 1.0 }
          const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString()
          const result: IExchangeRatesResponse = {
            base,
            rates: ratesWithBase,
            fetchedAt: new Date().toISOString(),
            expiresAt,
            source: 'frankfurter.app (ECB Live Feed)',
            isFallback: false,
          }

          await cacheSet(cacheKey, result, CACHE_TTL_SECONDS).catch(() => {})
          return result
        }
      }
    } catch (fallbackErr) {
      logger.warn('Secondary exchange rate provider unavailable, activating baseline rates', {
        err: (fallbackErr as Error).message,
      })
    }

    // 3. Fallback: Safe baseline calculation relative to base currency
    const baseToUsd = BASELINE_RATES_USD[base] ?? 1.0
    const computedRates: Record<string, number> = {}

    for (const [code, usdRate] of Object.entries(BASELINE_RATES_USD)) {
      computedRates[code] = Math.round((usdRate / baseToUsd) * 100_000) / 100_000
    }

    const expiresAt = new Date(Date.now() + 600 * 1000).toISOString()
    const fallbackResult: IExchangeRatesResponse = {
      base,
      rates: computedRates,
      fetchedAt: new Date().toISOString(),
      expiresAt,
      source: 'Cartiva Central Bank Baseline (Resilience Fallback)',
      isFallback: true,
    }

    return fallbackResult
  }

  /**
   * Retrieves exchange rate between two specific currencies.
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()

    if (from === to) return 1.0

    const ratesData = await this.getExchangeRates(from)
    if (ratesData.rates[to]) {
      return ratesData.rates[to]
    }

    // Cross rate lookup via default base
    const baseRates = await this.getExchangeRates(DEFAULT_BASE_CURRENCY)
    const fromRate = baseRates.rates[from] ?? 1.0
    const toRate = baseRates.rates[to]

    if (!toRate) {
      throw new AppError(`Unsupported exchange rate target currency: ${to}`, 400)
    }

    return toRate / fromRate
  }

  /**
   * Converts monetary amount between currencies with full audit snapshot.
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ICurrencyConversionResult> {
    const from = (fromCurrency || DEFAULT_BASE_CURRENCY).toUpperCase()
    const to = (toCurrency || DEFAULT_BASE_CURRENCY).toUpperCase()

    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      throw new AppError('Invalid amount for currency conversion', 400)
    }

    const ratesData = await this.getExchangeRates(from)
    const rate = from === to ? 1.0 : (ratesData.rates[to] ?? (await this.getRate(from, to)))

    // High precision conversion
    const convertedMoney = Money.from(amount).multiply(rate)
    const targetAmount = convertedMoney.round(to)
    const originalAmount = roundMoney(amount, from)

    return {
      originalAmount,
      originalCurrency: from,
      targetAmount,
      targetCurrency: to,
      rate,
      formattedOriginal: formatMoney(originalAmount, from),
      formattedTarget: formatMoney(targetAmount, to),
      rateTimestamp: ratesData.fetchedAt,
      rateSource: ratesData.source,
    }
  }

  /**
   * Returns list of all supported currencies with rich metadata.
   */
  getSupportedCurrencies(): ICurrencyMetadata[] {
    return Object.values(SUPPORTED_CURRENCIES).filter((c) => c.isActive)
  }
}

export const currencyService = new CurrencyService()
