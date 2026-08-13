import type { Request, Response, NextFunction } from 'express'
import * as analyticsService from './analytics.service.js'

const period = (req: Request) => {
  const { start, end } = req.query as { start?: string; end?: string }
  return { start, end }
}

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getDashboard(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getSalesSummary(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getCustomerSummary(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getVendorAnalytics(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getProductAnalytics(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getInventory = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getInventoryAnalytics()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getFinance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getFinanceAnalytics(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getLogistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = period(req)
    const data = await analyticsService.getLogisticsAnalytics(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, type, ...parameters } = req.body as {
      title: string
      type: string
      [k: string]: unknown
    }
    const data = await analyticsService.generateReport(title, type, parameters, req.user!.userId)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>
    const data = await analyticsService.listReports(+page, +limit)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getReport(req.params['id'] as string)
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' })
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const exportReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'json' } = req.body as { format?: string }
    const result = await analyticsService.exportReport(req.params['id'] as string, format)
    if (!result) return res.status(404).json({ success: false, message: 'Report not found' })

    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.content)
  } catch (err) {
    next(err)
  }
}
