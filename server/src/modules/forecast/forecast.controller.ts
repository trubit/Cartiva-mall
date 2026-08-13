import type { Request, Response, NextFunction } from 'express'
import * as forecastService from './forecast.service.js'
import type { ForecastType } from '../../../../src/shared/types/forecast.types.js'

export const getSalesForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '30', granularity = 'daily' } = req.query as Record<string, string>
    const type: ForecastType =
      granularity === 'monthly'
        ? 'sales_monthly'
        : granularity === 'weekly'
          ? 'sales_weekly'
          : 'sales_daily'
    const data = await forecastService.getForecastByType(type, +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getInventoryForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '30' } = req.query as Record<string, string>
    const data = await forecastService.getForecastByType('inventory_depletion', +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getCustomerForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '30' } = req.query as Record<string, string>
    const data = await forecastService.getForecastByType('customer_churn', +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getProductForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '30' } = req.query as Record<string, string>
    const data = await forecastService.getForecastByType('sales_daily', +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getVendorForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '30' } = req.query as Record<string, string>
    const data = await forecastService.getForecastByType('vendor_performance', +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getLogisticsForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '30' } = req.query as Record<string, string>
    const data = await forecastService.getForecastByType('shipping_demand', +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getFinanceForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon = '12' } = req.query as Record<string, string>
    const data = await forecastService.getForecastByType('revenue_projection', +horizon)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getRecommendations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await forecastService.getRecommendations()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const runScenario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await forecastService.runScenario(req.body)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getForecastHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, page = '1', limit = '20' } = req.query as Record<string, string>
    const data = await forecastService.getForecastHistory(type, +page, +limit)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}
