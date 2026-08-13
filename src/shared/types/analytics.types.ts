export type ReportExportFormat = 'csv' | 'json'
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'

export interface KpiMetric {
  label: string
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
  unit?: string
}

export interface SalesSummary {
  grossSales: number
  netSales: number
  revenue: number
  averageOrderValue: number
  totalOrders: number
  conversionRate: number
  refunds: number
  period: { start: string; end: string }
}

export interface CustomerSummary {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  averageLifetimeValue: number
  retentionRate: number
  period: { start: string; end: string }
}

export interface VendorAnalytics {
  vendorId: string
  vendorName: string
  totalRevenue: number
  totalOrders: number
  commissionEarned: number
  averageRating: number
  returnRate: number
}

export interface ProductAnalytics {
  productId: string
  name: string
  totalSold: number
  revenue: number
  views: number
  conversionRate: number
  averageRating: number
  returnRate: number
}

export interface InventoryAnalytics {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
  turnoverRate: number
}

export interface LogisticsAnalytics {
  totalShipments: number
  deliveredOnTime: number
  deliverySuccessRate: number
  averageDeliveryDays: number
  returnRate: number
}

export interface DashboardData {
  sales: SalesSummary
  customers: CustomerSummary
  kpis: KpiMetric[]
  topProducts: ProductAnalytics[]
  topVendors: VendorAnalytics[]
}

export interface IReport {
  _id: string
  title: string
  type: string
  parameters: Record<string, unknown>
  data: Record<string, unknown>
  format: ReportExportFormat
  createdBy: string
  createdAt: string
}

export interface IScheduledReport {
  _id: string
  title: string
  reportType: string
  frequency: ScheduleFrequency
  parameters: Record<string, unknown>
  recipients: string[]
  isActive: boolean
  lastRunAt?: string
  nextRunAt?: string
  createdBy: string
  createdAt: string
}
