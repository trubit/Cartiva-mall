import type { Request, Response, NextFunction } from 'express'
import { currencyService } from './currency.service.js'
import { sendSuccess } from '../../utils/response.js'
import { DEFAULT_BASE_CURRENCY } from '../../../../src/shared/constants/currencies.js'

export const getSupportedCurrencies = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currencies = currencyService.getSupportedCurrencies()
    sendSuccess(
      res,
      { baseCurrency: DEFAULT_BASE_CURRENCY, currencies },
      'Supported currencies retrieved successfully',
    )
  } catch (err) {
    next(err)
  }
}

export const getExchangeRates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const base = (req.query['base'] as string) || DEFAULT_BASE_CURRENCY
    const ratesData = await currencyService.getExchangeRates(base)
    sendSuccess(res, ratesData, 'Exchange rates retrieved successfully')
  } catch (err) {
    next(err)
  }
}

export const convertCurrency = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const amount = parseFloat(
      (req.query['amount'] as string) || (req.body?.amount as string) || '0',
    )
    const from = (
      (req.query['from'] as string) ||
      (req.body?.from as string) ||
      DEFAULT_BASE_CURRENCY
    ).toUpperCase()
    const to = (
      (req.query['to'] as string) ||
      (req.body?.to as string) ||
      DEFAULT_BASE_CURRENCY
    ).toUpperCase()

    const result = await currencyService.convert(amount, from, to)
    sendSuccess(res, result, 'Currency converted successfully')
  } catch (err) {
    next(err)
  }
}
