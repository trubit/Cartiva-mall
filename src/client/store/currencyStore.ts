import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  type ICurrencyMetadata,
} from '../../shared/constants/currencies.js'
import { Money, formatMoney, roundMoney } from '../../shared/utils/money.js'
import { currencyService } from '../services/currencyService.js'

interface CurrencyState {
  currentCurrency: string
  rates: Record<string, number>
  rateSource: string
  ratesFetchedAt: string | null
  isLoadingRates: boolean

  // Actions
  setCurrency: (code: string) => void
  fetchRates: (force?: boolean) => Promise<void>
  getMetadata: (code?: string) => ICurrencyMetadata
  convertAmount: (amount: number, fromCurrency?: string, toCurrency?: string) => number
  formatPrice: (amount: number, fromCurrency?: string, showOriginalNotice?: boolean) => string
}

const DEFAULT_RATES: Record<string, number> = {
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

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currentCurrency: 'USD',
      rates: DEFAULT_RATES,
      rateSource: 'Initial Baseline Rates',
      ratesFetchedAt: null,
      isLoadingRates: false,

      setCurrency: (code: string) => {
        const upper = (code || DEFAULT_BASE_CURRENCY).toUpperCase()
        if (SUPPORTED_CURRENCIES[upper]) {
          set({ currentCurrency: upper })
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('cartiva-currency-change', { detail: { currency: upper } }),
            )
          }
        }
      },

      fetchRates: async (force = false) => {
        const state = get()
        // Check if rates were fetched in the last 15 minutes unless forced
        if (!force && state.ratesFetchedAt) {
          const elapsed = Date.now() - new Date(state.ratesFetchedAt).getTime()
          if (elapsed < 15 * 60 * 1000 && Object.keys(state.rates).length > 1) {
            return
          }
        }

        set({ isLoadingRates: true })
        try {
          const res = await currencyService.getExchangeRates('USD')
          if (res && res.rates && Object.keys(res.rates).length > 0) {
            set({
              rates: { ...DEFAULT_RATES, ...res.rates },
              rateSource: res.source || 'Live Exchange Provider',
              ratesFetchedAt: res.fetchedAt || new Date().toISOString(),
              isLoadingRates: false,
            })
          } else {
            set({ isLoadingRates: false })
          }
        } catch {
          set({ isLoadingRates: false })
        }
      },

      getMetadata: (code?: string) => {
        const c = (code || get().currentCurrency).toUpperCase()
        return SUPPORTED_CURRENCIES[c] || SUPPORTED_CURRENCIES['USD']
      },

      convertAmount: (
        amount: number,
        fromCurrency = DEFAULT_BASE_CURRENCY,
        toCurrency?: string,
      ): number => {
        const from = fromCurrency.toUpperCase()
        const to = (toCurrency || get().currentCurrency).toUpperCase()

        if (from === to || isNaN(amount) || !isFinite(amount)) {
          return roundMoney(amount, to)
        }

        const rates = get().rates
        const fromRate = rates[from] ?? 1.0
        const toRate = rates[to] ?? 1.0

        if (!fromRate || !toRate) {
          return roundMoney(amount, to)
        }

        // Cross rate calculation via base USD
        const crossRate = toRate / fromRate
        return Money.from(amount).multiply(crossRate).round(to)
      },

      formatPrice: (amount: number, fromCurrency = DEFAULT_BASE_CURRENCY): string => {
        const target = get().currentCurrency
        const converted = get().convertAmount(amount, fromCurrency, target)
        return formatMoney(converted, target)
      },
    }),
    {
      name: 'cartiva-currency',
      partialize: (state) => ({
        currentCurrency: state.currentCurrency,
        rates: state.rates,
        ratesFetchedAt: state.ratesFetchedAt,
        rateSource: state.rateSource,
      }),
    },
  ),
)
