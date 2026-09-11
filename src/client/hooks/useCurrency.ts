import { useCallback } from 'react'
import { useCurrencyStore } from '../store/currencyStore.js'
import { SUPPORTED_CURRENCIES, DEFAULT_BASE_CURRENCY } from '../../shared/constants/currencies.js'
import { Money, formatMoney, roundMoney } from '../../shared/utils/money.js'

export function useCurrency() {
  const currentCurrency = useCurrencyStore((s) => s.currentCurrency)
  const rates = useCurrencyStore((s) => s.rates)
  const rateSource = useCurrencyStore((s) => s.rateSource)
  const ratesFetchedAt = useCurrencyStore((s) => s.ratesFetchedAt)
  const isLoadingRates = useCurrencyStore((s) => s.isLoadingRates)
  const setCurrency = useCurrencyStore((s) => s.setCurrency)
  const fetchRates = useCurrencyStore((s) => s.fetchRates)
  const getMetadata = useCurrencyStore((s) => s.getMetadata)

  const meta = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES['USD']

  const convertAmount = useCallback(
    (amount: number, fromCurrency = DEFAULT_BASE_CURRENCY, toCurrency?: string): number => {
      const from = (fromCurrency || DEFAULT_BASE_CURRENCY).toUpperCase()
      const to = (toCurrency || currentCurrency).toUpperCase()

      if (from === to || isNaN(amount) || !isFinite(amount)) {
        return roundMoney(amount, to)
      }

      const fromRate = rates[from] ?? 1.0
      const toRate = rates[to] ?? 1.0

      if (!fromRate || !toRate) {
        return roundMoney(amount, to)
      }

      const crossRate = toRate / fromRate
      return Money.from(amount).multiply(crossRate).round(to)
    },
    [currentCurrency, rates],
  )

  const formatPrice = useCallback(
    (amount: number, fromCurrency = DEFAULT_BASE_CURRENCY): string => {
      const converted = convertAmount(amount, fromCurrency, currentCurrency)
      return formatMoney(converted, currentCurrency)
    },
    [convertAmount, currentCurrency],
  )

  return {
    currentCurrency,
    rates,
    rateSource,
    ratesFetchedAt,
    isLoadingRates,
    setCurrency,
    fetchRates,
    formatPrice,
    formatCurrency: formatPrice,
    convertAmount,
    getMetadata,
    symbol: meta.symbol,
    flag: meta.flag,
    code: meta.code,
    name: meta.name,
    baseCurrency: DEFAULT_BASE_CURRENCY,
  }
}

export default useCurrency
