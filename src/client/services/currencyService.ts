import api from './api.js'
import type {
  ISupportedCurrenciesResponse,
  IExchangeRatesResponse,
  ICurrencyConversionResult,
} from '../../shared/types/currency.types.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

export const currencyService = {
  async getSupportedCurrencies(): Promise<ISupportedCurrenciesResponse> {
    const res = await api.get<ApiResponse<ISupportedCurrenciesResponse>>('/currencies')
    return res.data.data!
  },

  async getExchangeRates(base = 'USD'): Promise<IExchangeRatesResponse> {
    const res = await api.get<ApiResponse<IExchangeRatesResponse>>(`/currencies/rates?base=${base}`)
    return res.data.data!
  },

  async convert(amount: number, from: string, to: string): Promise<ICurrencyConversionResult> {
    const res = await api.get<ApiResponse<ICurrencyConversionResult>>(
      `/currencies/convert?amount=${amount}&from=${from}&to=${to}`,
    )
    return res.data.data!
  },
}
