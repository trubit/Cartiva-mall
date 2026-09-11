import type { ICurrencyMetadata } from '../constants/currencies.js'

export type CurrencyCode = string

export interface IExchangeRatesResponse {
  base: string
  rates: Record<string, number>
  fetchedAt: string
  expiresAt: string
  source: string
  isFallback?: boolean
}

export interface ICurrencyConversionRequest {
  amount: number
  from: string
  to: string
}

export interface ICurrencyConversionResult {
  originalAmount: number
  originalCurrency: string
  targetAmount: number
  targetCurrency: string
  rate: number
  formattedOriginal: string
  formattedTarget: string
  rateTimestamp: string
  rateSource: string
}

export interface ISupportedCurrenciesResponse {
  baseCurrency: string
  currencies: ICurrencyMetadata[]
}
