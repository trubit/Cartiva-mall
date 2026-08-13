import mongoose from 'mongoose'
import { Forecast } from './forecast.model.js'
import { DecisionRecommendation } from './decisionRecommendation.model.js'
import { cacheGet, cacheSet } from '../../utils/cache.js'
import type {
  ForecastType,
  ForecastDataPoint,
  ScenarioRequest,
} from '../../../../src/shared/types/forecast.types.js'

const CACHE_TTL = 600

const movingAverage = (values: number[], window: number): number => {
  if (values.length === 0) return 0
  const slice = values.slice(-window)
  return slice.reduce((s, v) => s + v, 0) / slice.length
}

const linearTrend = (values: number[]): number => {
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = values.reduce((s, v) => s + v, 0) / n
  const num = values.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0)
  const den = values.reduce((s, _, i) => s + (i - xMean) ** 2, 0)
  return den === 0 ? 0 : num / den
}

const generateDataPoints = (
  historicalValues: number[],
  horizon: number,
  granularity: 'day' | 'week' | 'month',
  confidenceScore: number,
): ForecastDataPoint[] => {
  const avgValue = movingAverage(historicalValues, 7)
  const trend = linearTrend(historicalValues)
  const stdDev = Math.sqrt(
    historicalValues.reduce((s, v) => s + (v - avgValue) ** 2, 0) /
      Math.max(historicalValues.length - 1, 1),
  )
  const confidenceInterval = stdDev * (1 - confidenceScore / 100) * 1.96

  const msPerUnit =
    granularity === 'day' ? 86400000 : granularity === 'week' ? 604800000 : 2592000000
  const now = Date.now()

  return Array.from({ length: horizon }, (_, i) => {
    const predicted = Math.max(0, avgValue + trend * (historicalValues.length + i))
    return {
      date: new Date(now + (i + 1) * msPerUnit).toISOString(),
      predicted: Math.round(predicted * 100) / 100,
      confidenceLow: Math.max(0, Math.round((predicted - confidenceInterval) * 100) / 100),
      confidenceHigh: Math.round((predicted + confidenceInterval) * 100) / 100,
    }
  })
}

const getHistoricalSales = async (days: number): Promise<number[]> => {
  const Order = mongoose.model('Order')
  const results = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - days * 86400000) },
        status: { $in: ['paid', 'delivered', 'completed'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ])
  return results.map((r: { total: number }) => r.total)
}

const getHistoricalOrders = async (days: number): Promise<number[]> => {
  const Order = mongoose.model('Order')
  const results = await Order.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - days * 86400000) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])
  return results.map((r: { count: number }) => r.count)
}

export const generateForecast = async (type: ForecastType, horizon = 30) => {
  const cacheKey = `forecast:${type}:${horizon}`
  const cached = await cacheGet<unknown>(cacheKey)
  if (cached) return cached

  let historicalValues: number[]
  let granularity: 'day' | 'week' | 'month'
  let title: string

  switch (type) {
    case 'sales_daily':
      historicalValues = await getHistoricalSales(90)
      granularity = 'day'
      title = 'Daily Sales Forecast'
      break
    case 'sales_weekly':
      historicalValues = await getHistoricalSales(180)
      granularity = 'week'
      title = 'Weekly Sales Forecast'
      horizon = Math.min(horizon, 52)
      break
    case 'sales_monthly':
      historicalValues = await getHistoricalSales(365)
      granularity = 'month'
      title = 'Monthly Sales Forecast'
      horizon = Math.min(horizon, 12)
      break
    case 'shipping_demand':
      historicalValues = await getHistoricalOrders(90)
      granularity = 'day'
      title = 'Shipping Demand Forecast'
      break
    case 'revenue_projection':
      historicalValues = await getHistoricalSales(90)
      granularity = 'month'
      title = 'Revenue Projection'
      horizon = Math.min(horizon, 12)
      break
    default:
      historicalValues = await getHistoricalSales(90)
      granularity = 'day'
      title = `${type.replace(/_/g, ' ')} Forecast`
  }

  const confidenceScore =
    historicalValues.length >= 30 ? 82 : historicalValues.length >= 14 ? 65 : 50
  const dataPoints = generateDataPoints(historicalValues, horizon, granularity, confidenceScore)

  const forecast = await Forecast.create({
    type,
    title,
    horizon,
    granularity,
    dataPoints,
    confidenceScore,
    modelVersion: '1.0.0',
    generatedAt: new Date(),
    parameters: { historicalDays: historicalValues.length },
  })

  const result = forecast.toObject()
  await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL)
  return result
}

export const getForecastByType = (type: ForecastType, horizon?: number) =>
  generateForecast(type, horizon)

export const getRecommendations = async () => {
  const Order = mongoose.model('Order')
  const Inventory = mongoose.model('Inventory')

  const [pendingOrders, lowStockCount] = await Promise.all([
    Order.countDocuments({ status: 'pending' }),
    Inventory.countDocuments({ quantity: { $gt: 0, $lte: 5 } }),
  ])

  const recs = []

  if (lowStockCount > 0) {
    recs.push({
      category: 'inventory',
      title: 'Low Stock Alert',
      description: `${lowStockCount} products are running critically low.`,
      priority: lowStockCount > 20 ? 'critical' : 'high',
      impact: `Risk of ${lowStockCount} lost sales per day`,
      action: 'Review and reorder low-stock items immediately',
      data: { lowStockCount },
    })
  }

  if (pendingOrders > 50) {
    recs.push({
      category: 'operations',
      title: 'High Pending Order Volume',
      description: `${pendingOrders} orders are awaiting processing.`,
      priority: 'high',
      impact: 'Customer satisfaction risk',
      action: 'Assign additional warehouse staff or expedite processing',
      data: { pendingOrders },
    })
  }

  await DecisionRecommendation.insertMany(recs)
  return DecisionRecommendation.find().sort({ createdAt: -1 }).limit(20).lean()
}

export const runScenario = async (req: ScenarioRequest) => {
  const baseForecast = await generateForecast(req.type)
  const base = baseForecast as { dataPoints: ForecastDataPoint[] }

  return req.scenarios.map((scenario) => ({
    scenarioName: scenario.name,
    adjustmentFactor: scenario.adjustmentFactor,
    dataPoints: base.dataPoints.map((dp) => ({
      ...dp,
      predicted: Math.round(dp.predicted * scenario.adjustmentFactor * 100) / 100,
      confidenceLow: Math.round(dp.confidenceLow * scenario.adjustmentFactor * 100) / 100,
      confidenceHigh: Math.round(dp.confidenceHigh * scenario.adjustmentFactor * 100) / 100,
    })),
    totalPredicted: base.dataPoints.reduce(
      (s, dp) => s + dp.predicted * scenario.adjustmentFactor,
      0,
    ),
  }))
}

export const getForecastHistory = async (type?: string, page = 1, limit = 20) => {
  const filter: Record<string, unknown> = {}
  if (type) filter.type = type
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Forecast.find(filter).sort({ generatedAt: -1 }).skip(skip).limit(limit).lean(),
    Forecast.countDocuments(filter),
  ])
  return { items, total, page, limit }
}
