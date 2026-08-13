import type { Request, Response, NextFunction } from 'express'
import * as financeService from './finance.service.js'

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      start = new Date(Date.now() - 30 * 86400000).toISOString(),
      end = new Date().toISOString(),
    } = req.query as {
      start?: string
      end?: string
    }
    const data = await financeService.getFinanceSummary(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createJournalEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const entry = await financeService.createJournalEntry(req.body, userId)
    res.status(201).json({ success: true, data: entry })
  } catch (err) {
    next(err)
  }
}

export const listJournalEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>
    const data = await financeService.listJournalEntries(+page, +limit, status)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const reverseJournalEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await financeService.reverseJournalEntry(
      req.params['id'] as string,
      req.user!.userId,
    )
    res.json({ success: true, data: entry })
  } catch (err) {
    next(err)
  }
}

export const getLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountCode, start, end } = req.query as Record<string, string>
    const data = await financeService.getGeneralLedger(accountCode, start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listAccounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await financeService.listAccounts()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await financeService.createInvoice(req.body, req.user!.userId)
    res.status(201).json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}

export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, type } = req.query as Record<string, string>
    const data = await financeService.listInvoices(+page, +limit, status, type)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await financeService.getInvoice(req.params['id'] as string)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const calculateTax = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.calculateTax(req.body)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export const listTaxRules = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await financeService.listTaxRules()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createTaxRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await financeService.createTaxRule(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createSettlement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await financeService.createSettlement(req.body, req.user!.userId)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listSettlements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', vendorId } = req.query as Record<string, string>
    const data = await financeService.listSettlements(+page, +limit, vendorId)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const getReconciliation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      start = new Date(Date.now() - 30 * 86400000).toISOString(),
      end = new Date().toISOString(),
    } = req.query as Record<string, string>
    const data = await financeService.getReconciliation(start, end)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type = 'profit_loss',
      start = new Date(Date.now() - 30 * 86400000).toISOString(),
      end = new Date().toISOString(),
    } = req.body as { type?: string; start?: string; end?: string }
    const data = await financeService.generateFinancialReport(type, start, end, req.user!.userId)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', type } = req.query as Record<string, string>
    const data = await financeService.listReports(+page, +limit, type)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const getAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', entityType } = req.query as Record<string, string>
    const data = await financeService.getAuditTrail(+page, +limit, entityType)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const getAccountingPeriods = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await financeService.getAccountingPeriods()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const closePeriod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await financeService.closePeriod(req.params['id'] as string, req.user!.userId)
    res.json({ success: true, message: 'Period closed successfully' })
  } catch (err) {
    next(err)
  }
}
