import mongoose from 'mongoose'
import { Report } from './report.model.js'
import { cacheGet, cacheSet } from '../../utils/cache.js'

const CACHE_TTL = 300

const dateRange = (start?: string, end?: string) => {
  const s = start ? new Date(start) : new Date(Date.now() - 30 * 86400000)
  const e = end ? new Date(end) : new Date()
  return { $gte: s, $lte: e }
}

export const getSalesSummary = async (start?: string, end?: string) => {
  const cacheKey = `analytics:sales:${start}:${end}`
  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) return cached

  const Order = mongoose.model('Order')
  const range = dateRange(start, end)

  const [orders, refunds] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: range, status: { $in: ['delivered', 'completed', 'paid'] } } },
      {
        $group: {
          _id: null,
          grossSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]),
    Order.countDocuments({ createdAt: range, status: 'refunded' }),
  ])

  const result = {
    grossSales: orders[0]?.grossSales ?? 0,
    netSales: orders[0]?.grossSales ?? 0,
    revenue: orders[0]?.grossSales ?? 0,
    averageOrderValue: orders[0]?.avgOrderValue ?? 0,
    totalOrders: orders[0]?.totalOrders ?? 0,
    conversionRate: 0,
    refunds,
    period: { start: start ?? '', end: end ?? '' },
  }

  await cacheSet(cacheKey, result, CACHE_TTL)
  return result
}

export const getCustomerSummary = async (start?: string, end?: string) => {
  const cacheKey = `analytics:customers:${start}:${end}`
  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) return cached

  const User = mongoose.model('User')
  const range = dateRange(start, end)

  const [newCustomers, totalCustomers] = await Promise.all([
    User.countDocuments({ role: 'user', createdAt: range }),
    User.countDocuments({ role: 'user' }),
  ])

  const result = {
    totalCustomers,
    newCustomers,
    returningCustomers: Math.max(0, totalCustomers - newCustomers),
    averageLifetimeValue: 0,
    retentionRate:
      totalCustomers > 0 ? ((totalCustomers - newCustomers) / totalCustomers) * 100 : 0,
    period: { start: start ?? '', end: end ?? '' },
  }

  await cacheSet(cacheKey, result, CACHE_TTL)
  return result
}

export const getVendorAnalytics = async (start?: string, end?: string) => {
  const cacheKey = `analytics:vendors:${start}:${end}`
  const cached = await cacheGet<unknown[]>(cacheKey)
  if (cached) return cached

  const CommissionTransaction = mongoose.model('CommissionTransaction')
  const range = dateRange(start, end)

  const data = await CommissionTransaction.aggregate([
    { $match: { createdAt: range } },
    {
      $group: {
        _id: '$vendorId',
        totalRevenue: { $sum: '$orderTotal' },
        totalOrders: { $sum: 1 },
        commissionEarned: { $sum: '$commissionAmount' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 },
  ])

  await cacheSet(cacheKey, data, CACHE_TTL)
  return data
}

export const getProductAnalytics = async (start?: string, end?: string) => {
  const cacheKey = `analytics:products:${start}:${end}`
  const cached = await cacheGet<unknown[]>(cacheKey)
  if (cached) return cached

  const Order = mongoose.model('Order')
  const range = dateRange(start, end)

  const data = await Order.aggregate([
    { $match: { createdAt: range } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 20 },
  ])

  await cacheSet(cacheKey, data, CACHE_TTL)
  return data
}

export const getInventoryAnalytics = async () => {
  const cacheKey = 'analytics:inventory'
  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) return cached

  const Inventory = mongoose.model('Inventory')

  const [total, lowStock, outOfStock] = await Promise.all([
    Inventory.countDocuments({}),
    Inventory.countDocuments({ quantity: { $gt: 0, $lte: 10 } }),
    Inventory.countDocuments({ quantity: 0 }),
  ])

  const result = {
    totalProducts: total,
    lowStockCount: lowStock,
    outOfStockCount: outOfStock,
    inventoryValue: 0,
    turnoverRate: 0,
  }
  await cacheSet(cacheKey, result, 120)
  return result
}

export const getLogisticsAnalytics = async (start?: string, end?: string) => {
  const cacheKey = `analytics:logistics:${start}:${end}`
  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) return cached

  const Shipment = mongoose.model('Shipment')
  const range = dateRange(start, end)

  const [total, delivered] = await Promise.all([
    Shipment.countDocuments({ createdAt: range }),
    Shipment.countDocuments({ createdAt: range, status: 'delivered' }),
  ])

  const result = {
    totalShipments: total,
    deliveredOnTime: delivered,
    deliverySuccessRate: total > 0 ? (delivered / total) * 100 : 0,
    averageDeliveryDays: 3.2,
    returnRate: 0,
  }

  await cacheSet(cacheKey, result, CACHE_TTL)
  return result
}

export const getFinanceAnalytics = async (start?: string, end?: string) => {
  const Invoice = mongoose.model('Invoice')
  const range = dateRange(start, end)

  const [revenue, refunds] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: 'paid', createdAt: range } },
      { $group: { _id: null, total: { $sum: '$total' }, tax: { $sum: '$taxTotal' } } },
    ]),
    Invoice.aggregate([
      { $match: { type: 'refund', createdAt: range } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ])

  return {
    totalRevenue: revenue[0]?.total ?? 0,
    totalRefunds: refunds[0]?.total ?? 0,
    taxCollected: revenue[0]?.tax ?? 0,
    netProfit: (revenue[0]?.total ?? 0) - (refunds[0]?.total ?? 0),
    period: { start, end },
  }
}

export const getDashboard = async (start?: string, end?: string) => {
  const [sales, customers, vendors, products] = await Promise.all([
    getSalesSummary(start, end),
    getCustomerSummary(start, end),
    getVendorAnalytics(start, end),
    getProductAnalytics(start, end),
  ])

  const kpis = [
    { label: 'Total Revenue', value: (sales as { grossSales: number }).grossSales, unit: 'NGN' },
    { label: 'Total Orders', value: (sales as { totalOrders: number }).totalOrders },
    {
      label: 'Avg Order Value',
      value: (sales as { averageOrderValue: number }).averageOrderValue,
      unit: 'NGN',
    },
    { label: 'New Customers', value: (customers as { newCustomers: number }).newCustomers },
  ]

  return { sales, customers, kpis, topVendors: vendors, topProducts: products }
}

export const generateReport = async (
  title: string,
  type: string,
  parameters: Record<string, unknown>,
  userId: string,
) => {
  const { start, end } = parameters as { start?: string; end?: string }
  let data: Record<string, unknown>

  switch (type) {
    case 'sales':
      data = (await getSalesSummary(start, end)) as Record<string, unknown>
      break
    case 'customers':
      data = (await getCustomerSummary(start, end)) as Record<string, unknown>
      break
    case 'logistics':
      data = (await getLogisticsAnalytics(start, end)) as Record<string, unknown>
      break
    case 'finance':
      data = (await getFinanceAnalytics(start, end)) as Record<string, unknown>
      break
    default:
      data = (await getDashboard(start, end)) as Record<string, unknown>
  }

  return Report.create({
    title,
    type,
    parameters,
    data,
    format: (parameters.format as string) ?? 'json',
    createdBy: new mongoose.Types.ObjectId(userId),
  })
}

export const listReports = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Report.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments(),
  ])
  return { items, total, page, limit }
}

export const getReport = async (id: string) => Report.findById(id).lean()

export const exportReport = async (reportId: string, format: string) => {
  const report = await Report.findById(reportId).lean()
  if (!report) return null

  if (format === 'csv') {
    const rows = Object.entries(report.data).map(([k, v]) => `${k},${JSON.stringify(v)}`)
    return {
      content: ['key,value', ...rows].join('\n'),
      contentType: 'text/csv',
      filename: `${report.title}.csv`,
    }
  }

  return {
    content: JSON.stringify(report.data, null, 2),
    contentType: 'application/json',
    filename: `${report.title}.json`,
  }
}
