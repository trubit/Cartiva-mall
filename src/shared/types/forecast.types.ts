export type ForecastType =
  | 'sales_daily'
  | 'sales_weekly'
  | 'sales_monthly'
  | 'inventory_depletion'
  | 'customer_churn'
  | 'revenue_projection'
  | 'shipping_demand'
  | 'refund_projection'
  | 'vendor_performance'

export interface ForecastDataPoint {
  date: string
  predicted: number
  actual?: number
  confidenceLow: number
  confidenceHigh: number
}

export interface IForecast {
  _id: string
  type: ForecastType
  title: string
  horizon: number
  granularity: 'day' | 'week' | 'month'
  dataPoints: ForecastDataPoint[]
  confidenceScore: number
  modelVersion: string
  generatedAt: string
  parameters: Record<string, unknown>
}

export interface IDecisionRecommendation {
  _id: string
  category: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: string
  action: string
  data: Record<string, unknown>
  createdAt: string
}

export interface ScenarioRequest {
  type: ForecastType
  scenarios: {
    name: string
    adjustmentFactor: number
  }[]
}

export interface ScenarioResult {
  scenarioName: string
  adjustmentFactor: number
  dataPoints: ForecastDataPoint[]
  totalPredicted: number
}
