import mongoose from 'mongoose'
import { AiInsight, type InsightScope, type InsightStatus } from './aiInsight.model.js'
import { AiFeedback } from './aiFeedback.model.js'
import { Order } from '../order/order.model.js'
import { Product } from '../product/product.model.js'
import { Inventory } from '../inventory/inventory.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { v4 as uuidv4 } from 'uuid'

export interface QueryAnalyticsResult {
  query: string
  summary: string
  confidenceScore: number
  dataPoints: Array<{ label: string; value: number | string }>
  explainableNotes: string
  suggestedActions: string[]
}

// ─── Natural-Language Analytics Engine ───────────────────────────────────────

export const queryAnalytics = async (query: string): Promise<QueryAnalyticsResult> => {
  const q = query.toLowerCase()

  if (q.includes('stock') || q.includes('inventory') || q.includes('low')) {
    const lowStockItems = await Inventory.find({ reservedQuantity: { $gt: 0 } })
      .limit(5)
      .lean()
    return {
      query,
      summary: `Found ${lowStockItems.length} inventory SKUs with reserved items requiring replenishment attention.`,
      confidenceScore: 92,
      dataPoints: lowStockItems.map((item) => ({
        label: `Product ${item.productId.toString()}`,
        value: `Reserved: ${item.reservedQuantity}, Warehouse: ${item.warehouseId.toString()}`,
      })),
      explainableNotes:
        'Calculated directly from Inventory reserved quantities across active warehouses.',
      suggestedActions: [
        'Review supplier lead times for top SKUs',
        'Trigger automatic reorder for low-stock thresholds',
      ],
    }
  }

  if (q.includes('revenue') || q.includes('sales') || q.includes('top')) {
    const totalOrders = await Order.countDocuments()
    const deliveredCount = await Order.countDocuments({ orderStatus: 'delivered' })
    return {
      query,
      summary: `Marketplace recorded ${totalOrders} total orders with ${deliveredCount} successfully delivered transactions.`,
      confidenceScore: 95,
      dataPoints: [
        { label: 'Total Orders', value: totalOrders },
        { label: 'Delivered Orders', value: deliveredCount },
      ],
      explainableNotes: 'Aggregated real-time order states from completed transaction records.',
      suggestedActions: [
        'Promote high-converting product categories on Homepage',
        'Analyze order fulfillment SLA for non-delivered orders',
      ],
    }
  }

  // Default general intelligence response
  const activeProducts = await Product.countDocuments({
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
  })
  return {
    query,
    summary: `Marketplace intelligence shows ${activeProducts} active catalog products serving active buyer traffic.`,
    confidenceScore: 88,
    dataPoints: [{ label: 'Active Catalog Products', value: activeProducts }],
    explainableNotes: 'Derived from live product catalog database counts.',
    suggestedActions: [
      'Optimize product recommendation carousels for new arrivals',
      'Monitor catalog price parity across seller listings',
    ],
  }
}

// ─── Automated Insight Generation ─────────────────────────────────────────────

export const generateMarketplaceInsights = async (): Promise<void> => {
  const totalOrders = await Order.countDocuments()
  const lowStockCount = await Inventory.countDocuments({ reservedQuantity: { $gt: 0 } })

  if (lowStockCount > 0) {
    const insightId = `ins_${uuidv4().replace(/-/g, '').substring(0, 12)}`
    await AiInsight.findOneAndUpdate(
      { title: 'Inventory Replenishment Alert' },
      {
        insightId,
        scope: 'inventory',
        title: 'Inventory Replenishment Alert',
        summary: `Detected ${lowStockCount} inventory SKUs experiencing high demand velocity with reserved allocations.`,
        metrics: { lowStockCount, totalOrders },
        confidenceScore: 90,
        recommendedActions: [
          'Initiate purchase order replenishment with primary suppliers',
          'Adjust safety stock thresholds for peak season demand',
        ],
        status: 'NEW',
      },
      { upsert: true },
    )
  }
}

// ─── Insights API Operations ──────────────────────────────────────────────────

export const getInsights = async (
  scope?: InsightScope,
  status?: InsightStatus,
  page = 1,
  limit = 20,
) => {
  const filter: Record<string, unknown> = {}
  if (scope) filter['scope'] = scope
  if (status) filter['status'] = status

  const skip = (page - 1) * limit
  const [insights, total] = await Promise.all([
    AiInsight.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AiInsight.countDocuments(filter),
  ])

  return {
    insights,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

export const updateInsightStatus = async (
  insightId: string,
  status: InsightStatus,
  userId?: string,
) => {
  const insight = await AiInsight.findOne({ insightId })
  if (!insight) throw new AppError('Insight not found', 404)

  insight.status = status
  if (userId && mongoose.isValidObjectId(userId)) {
    insight.acknowledgedBy = new mongoose.Types.ObjectId(userId)
    insight.acknowledgedAt = new Date()
  }
  await insight.save()
  return insight
}

export const submitInsightFeedback = async (
  insightId: string,
  userId: string,
  helpful: boolean,
  notes?: string,
) => {
  const feedback = await AiFeedback.findOneAndUpdate(
    { insightId, userId: new mongoose.Types.ObjectId(userId) },
    { helpful, notes },
    { upsert: true, returnDocument: 'after' },
  )
  return feedback
}
