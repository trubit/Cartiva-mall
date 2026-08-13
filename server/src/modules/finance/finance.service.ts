import mongoose from 'mongoose'
import { Account } from './account.model.js'
import { JournalEntry } from './journalEntry.model.js'
import { Invoice } from './invoice.model.js'
import { TaxRule } from './taxRule.model.js'
import { VendorSettlement } from './vendorSettlement.model.js'
import { CommissionTransaction } from './commissionTransaction.model.js'
import { FinancialReport } from './financialReport.model.js'
import { AuditLedger } from './auditLedger.model.js'
import { AccountingPeriod } from './accountingPeriod.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import type {
  CreateJournalEntryRequest,
  CreateInvoiceRequest,
  ITaxRule,
  ReportType,
  SettlementCreateRequest,
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxType,
} from '../../../../src/shared/types/finance.types.js'

let journalCounter = 0
let invoiceCounter = 0

const nextEntryNumber = () => `JE-${Date.now()}-${++journalCounter}`
const nextInvoiceNumber = () => `INV-${Date.now()}-${++invoiceCounter}`

const DEFAULT_ACCOUNTS = [
  { code: '1001', name: 'Cash & Cash Equivalents', type: 'asset', category: 'cash' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'receivable' },
  { code: '2001', name: 'Accounts Payable', type: 'liability', category: 'payable' },
  { code: '2100', name: 'Tax Payable', type: 'liability', category: 'tax_payable' },
  { code: '2200', name: 'Vendor Settlements Payable', type: 'liability', category: 'settlement' },
  { code: '3001', name: 'Retained Earnings', type: 'equity', category: 'equity' },
  { code: '4001', name: 'Marketplace Revenue', type: 'revenue', category: 'revenue' },
  { code: '4100', name: 'Commission Revenue', type: 'revenue', category: 'commission' },
  { code: '5001', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_goods' },
  { code: '5100', name: 'Refunds Expense', type: 'expense', category: 'refund' },
  { code: '5200', name: 'Operating Expenses', type: 'expense', category: 'operating_expense' },
] as const

export const seedDefaultAccounts = async (): Promise<void> => {
  for (const acc of DEFAULT_ACCOUNTS) {
    await Account.findOneAndUpdate({ code: acc.code }, { $setOnInsert: acc }, { upsert: true })
  }
}

export const getAccount = async (code: string) => {
  const account = await Account.findOne({ code, isActive: true }).lean()
  if (!account) throw new AppError(`Account ${code} not found`, 404)
  return account
}

export const listAccounts = async () => Account.find({ isActive: true }).sort({ code: 1 }).lean()

export const createJournalEntry = async (data: CreateJournalEntryRequest, userId: string) => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const resolvedLines = await Promise.all(
      data.lines.map(async (line) => {
        const account = await Account.findOne({ code: line.accountCode, isActive: true }).session(
          session,
        )
        if (!account) throw new AppError(`Account ${line.accountCode} not found`, 404)
        return {
          accountId: account._id,
          accountCode: account.code,
          accountName: account.name,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
        }
      }),
    )

    const totalDebit = resolvedLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0)

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new AppError('Journal entry is not balanced: debits must equal credits', 422)
    }

    const entry = await JournalEntry.create(
      [
        {
          entryNumber: nextEntryNumber(),
          description: data.description,
          reference: data.reference,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          lines: resolvedLines,
          totalDebit,
          totalCredit,
          status: 'posted',
          postedAt: new Date(),
          postedBy: new mongoose.Types.ObjectId(userId),
          createdBy: new mongoose.Types.ObjectId(userId),
        },
      ],
      { session },
    )

    for (const line of resolvedLines) {
      const delta = line.debit - line.credit
      await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: delta } }, { session })
    }

    await session.commitTransaction()
    return entry[0]
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    await session.endSession()
  }
}

export const reverseJournalEntry = async (entryId: string, userId: string) => {
  const original = await JournalEntry.findById(entryId)
  if (!original) throw new AppError('Journal entry not found', 404)
  if (original.status === 'reversed') throw new AppError('Entry already reversed', 409)

  const reversalLines = original.lines.map((l) => ({
    accountCode: l.accountCode,
    debit: l.credit,
    credit: l.debit,
    description: `Reversal of ${original.entryNumber}`,
  }))

  const reversal = await createJournalEntry(
    {
      description: `Reversal of: ${original.description}`,
      reference: original.reference,
      referenceType: original.referenceType,
      lines: reversalLines,
    },
    userId,
  )

  await JournalEntry.findByIdAndUpdate(entryId, {
    status: 'reversed',
    reversedAt: new Date(),
    reversedBy: new mongoose.Types.ObjectId(userId),
  })

  return reversal
}

export const listJournalEntries = async (page = 1, limit = 20, status?: string) => {
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    JournalEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    JournalEntry.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const getGeneralLedger = async (
  accountCode?: string,
  startDate?: string,
  endDate?: string,
) => {
  const filter: Record<string, unknown> = { status: 'posted' }
  if (startDate || endDate) {
    const dateFilter: Record<string, unknown> = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    filter.createdAt = dateFilter
  }

  const entries = await JournalEntry.find(filter).sort({ createdAt: 1 }).lean()

  if (accountCode) {
    return entries
      .map((e) => ({
        ...e,
        lines: e.lines.filter((l) => l.accountCode === accountCode),
      }))
      .filter((e) => e.lines.length > 0)
  }

  return entries
}

export const createInvoice = async (data: CreateInvoiceRequest, userId: string) => {
  const items = data.items.map((item) => {
    const subtotal = item.quantity * item.unitPrice - (item.discount ?? 0)
    const taxAmount = subtotal * ((item.taxRate ?? 0) / 100)
    const total = subtotal + taxAmount
    return { ...item, taxAmount, subtotal, total }
  })

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const taxTotal = items.reduce((s, i) => s + i.taxAmount, 0)
  const discountTotal = items.reduce((s, i) => s + (i.discount ?? 0), 0)
  const total = subtotal + taxTotal

  return Invoice.create({
    invoiceNumber: nextInvoiceNumber(),
    type: data.type,
    status: 'issued',
    issuedTo: data.issuedTo,
    vendorId: data.vendorId,
    orderId: data.orderId,
    items,
    subtotal,
    taxTotal,
    discountTotal,
    total,
    currency: data.currency ?? 'NGN',
    notes: data.notes,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    createdBy: new mongoose.Types.ObjectId(userId),
  })
}

export const listInvoices = async (page = 1, limit = 20, status?: string, type?: string) => {
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (type) filter.type = type
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const getInvoice = async (id: string) => {
  const invoice = await Invoice.findById(id).lean()
  if (!invoice) throw new AppError('Invoice not found', 404)
  return invoice
}

export const calculateTax = async (req: TaxCalculationRequest): Promise<TaxCalculationResult> => {
  let rule: any
  if (req.taxRuleId) {
    rule = await TaxRule.findById(req.taxRuleId).lean()
  } else {
    rule = await TaxRule.findOne({
      isActive: true,
      ...(req.jurisdiction ? { jurisdiction: req.jurisdiction } : {}),
      ...(req.type ? { type: req.type } : {}),
    }).lean()
  }

  const taxRate = rule ? rule.rate : 0
  const taxAmount = (req.amount * taxRate) / 100
  return {
    baseAmount: req.amount,
    taxRate,
    taxAmount,
    total: req.amount + taxAmount,
    rule: rule as ITaxRule | null,
  }
}

export const createSettlement = async (data: SettlementCreateRequest, userId: string) => {
  const start = new Date(data.periodStart)
  const end = new Date(data.periodEnd)

  const commissions = await CommissionTransaction.find({
    vendorId: new mongoose.Types.ObjectId(data.vendorId),
    settlementId: null,
    createdAt: { $gte: start, $lte: end },
  }).lean()

  const grossRevenue = commissions.reduce((s, c) => s + c.orderTotal, 0)
  const commissionAmount = commissions.reduce((s, c) => s + c.commissionAmount, 0)
  const taxWithheld = commissions.reduce((s, c) => s + c.taxOnCommission, 0)
  const netPayable = grossRevenue - commissionAmount - taxWithheld

  const [settlement] = await Promise.all([
    VendorSettlement.create({
      vendorId: new mongoose.Types.ObjectId(data.vendorId),
      vendorName: 'Vendor',
      periodStart: start,
      periodEnd: end,
      grossRevenue,
      commissionAmount,
      taxWithheld,
      refundsDeducted: 0,
      netPayable,
      status: 'pending',
    }),
  ])

  await CommissionTransaction.updateMany(
    { _id: { $in: commissions.map((c) => c._id) } },
    { $set: { settlementId: settlement._id } },
  )

  await auditFinance(
    'create_settlement',
    'VendorSettlement',
    settlement._id.toString(),
    userId,
    null,
    settlement,
  )
  logger.info(`Settlement created for vendor ${data.vendorId}`, { settlementId: settlement._id })
  return settlement
}

export const listSettlements = async (page = 1, limit = 20, vendorId?: string) => {
  const filter: Record<string, unknown> = {}
  if (vendorId) filter.vendorId = new mongoose.Types.ObjectId(vendorId)
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    VendorSettlement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VendorSettlement.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const getReconciliation = async (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const [invoiceTotal, settlementTotal, commissionTotal] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    VendorSettlement.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$netPayable' } } },
    ]),
    CommissionTransaction.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]),
  ])

  return {
    period: { start: startDate, end: endDate },
    invoiceTotal: invoiceTotal[0]?.total ?? 0,
    settlementTotal: settlementTotal[0]?.total ?? 0,
    commissionTotal: commissionTotal[0]?.total ?? 0,
    variance:
      (invoiceTotal[0]?.total ?? 0) -
      (settlementTotal[0]?.total ?? 0) -
      (commissionTotal[0]?.total ?? 0),
  }
}

export const generateFinancialReport = async (
  type: string,
  startDate: string,
  endDate: string,
  userId: string,
) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const [revenue, commissions, refunds, settlements] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: { $in: ['paid', 'issued'] }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$type', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    CommissionTransaction.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$commissionAmount' },
          net: { $sum: '$netCommission' },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { type: 'refund', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    VendorSettlement.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', total: { $sum: '$netPayable' } } },
    ]),
  ])

  const totalRevenue = revenue.reduce((s: number, r: { total: number }) => s + r.total, 0)
  const totalCommissions = commissions[0]?.total ?? 0
  const totalRefunds = refunds[0]?.total ?? 0
  const netProfit = totalRevenue - totalRefunds

  const data = {
    revenue,
    commissions,
    refunds,
    settlements,
    totalRevenue,
    totalCommissions,
    totalRefunds,
    netProfit,
  }

  return FinancialReport.create({
    type: type as ReportType,
    title: `${type.replace(/_/g, ' ').toUpperCase()} — ${startDate} to ${endDate}`,
    periodStart: start,
    periodEnd: end,
    data,
    generatedBy: new mongoose.Types.ObjectId(userId),
  })
}

export const listReports = async (page = 1, limit = 20, type?: string) => {
  const filter: Record<string, unknown> = {}
  if (type) filter.type = type
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    FinancialReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FinancialReport.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const getAuditTrail = async (page = 1, limit = 20, entityType?: string) => {
  const filter: Record<string, unknown> = {}
  if (entityType) filter.entityType = entityType
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    AuditLedger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLedger.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const auditFinance = async (
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  before: unknown,
  after: unknown,
  ip?: string,
) => {
  AuditLedger.create({
    action,
    entityType,
    entityId,
    userId: new mongoose.Types.ObjectId(userId),
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
    ip,
  }).catch(() => {})
}

export const listTaxRules = async () =>
  TaxRule.find({ isActive: true }).sort({ jurisdiction: 1 }).lean()

export const createTaxRule = async (data: {
  name: string
  type: string
  jurisdiction: string
  rate: number
  appliesTo?: string[]
}) => TaxRule.create({ ...data, type: data.type as TaxType, isActive: true })

export const getFinanceSummary = async (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const [revenueAgg, commissionsAgg, pendingSettlements, openInvoices] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, tax: { $sum: '$taxTotal' } } },
    ]),
    CommissionTransaction.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]),
    VendorSettlement.countDocuments({ status: 'pending' }),
    Invoice.countDocuments({ status: 'issued' }),
  ])

  const totalRevenue = revenueAgg[0]?.revenue ?? 0
  const totalTax = revenueAgg[0]?.tax ?? 0
  const totalCommissions = commissionsAgg[0]?.total ?? 0

  return {
    totalRevenue,
    totalExpenses: 0,
    netProfit: totalRevenue,
    totalTax,
    totalCommissions,
    pendingSettlements,
    openInvoices,
    period: { start: startDate, end: endDate },
  }
}

export const getAccountingPeriods = async () =>
  AccountingPeriod.find().sort({ startDate: -1 }).lean()

export const closePeriod = async (periodId: string, userId: string) => {
  const period = await AccountingPeriod.findById(periodId)
  if (!period) throw new AppError('Accounting period not found', 404)
  if (period.status !== 'open') throw new AppError('Period is not open', 409)

  await AccountingPeriod.findByIdAndUpdate(periodId, {
    status: 'closed',
    closedAt: new Date(),
    closedBy: new mongoose.Types.ObjectId(userId),
  })

  await auditFinance(
    'close_period',
    'AccountingPeriod',
    periodId,
    userId,
    { status: 'open' },
    { status: 'closed' },
  )
}
