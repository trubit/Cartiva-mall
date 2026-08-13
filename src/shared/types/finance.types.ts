export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type AccountCategory =
  | 'cash'
  | 'receivable'
  | 'payable'
  | 'revenue'
  | 'cost_of_goods'
  | 'operating_expense'
  | 'tax_payable'
  | 'commission'
  | 'settlement'
  | 'refund'
  | 'equity'

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed'
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'refunded'
export type InvoiceType =
  | 'sale'
  | 'vendor_settlement'
  | 'commission'
  | 'refund'
  | 'credit_note'
  | 'debit_note'
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type ReportType =
  | 'profit_loss'
  | 'balance_sheet'
  | 'cash_flow'
  | 'tax_summary'
  | 'commission_summary'
export type TaxType = 'vat' | 'gst' | 'sales_tax' | 'withholding'
export type PeriodStatus = 'open' | 'closed' | 'locked'

export interface IAccount {
  _id: string
  code: string
  name: string
  type: AccountType
  category: AccountCategory
  description?: string
  balance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface IJournalLine {
  accountId: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description?: string
}

export interface IJournalEntry {
  _id: string
  entryNumber: string
  description: string
  reference?: string
  referenceType?: string
  referenceId?: string
  lines: IJournalLine[]
  totalDebit: number
  totalCredit: number
  status: JournalEntryStatus
  postedAt?: string
  postedBy?: string
  reversedAt?: string
  reversedBy?: string
  reversalOf?: string
  periodId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  discount: number
  subtotal: number
  total: number
}

export interface IInvoice {
  _id: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  issuedTo?: string
  vendorId?: string
  orderId?: string
  items: IInvoiceItem[]
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  currency: string
  notes?: string
  dueDate?: string
  paidAt?: string
  voidedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ITaxRule {
  _id: string
  name: string
  type: TaxType
  jurisdiction: string
  rate: number
  isActive: boolean
  appliesTo: string[]
  createdAt: string
  updatedAt: string
}

export interface IVendorSettlement {
  _id: string
  vendorId: string
  vendorName: string
  periodStart: string
  periodEnd: string
  grossRevenue: number
  commissionAmount: number
  taxWithheld: number
  refundsDeducted: number
  netPayable: number
  status: SettlementStatus
  reference?: string
  invoiceId?: string
  processedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ICommissionTransaction {
  _id: string
  vendorId: string
  orderId: string
  orderTotal: number
  commissionRate: number
  commissionAmount: number
  taxOnCommission: number
  netCommission: number
  settlementId?: string
  createdAt: string
  updatedAt: string
}

export interface IFinancialReport {
  _id: string
  type: ReportType
  title: string
  periodStart: string
  periodEnd: string
  data: Record<string, unknown>
  generatedBy: string
  createdAt: string
}

export interface IAuditLedger {
  _id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
  createdAt: string
}

export interface IAccountingPeriod {
  _id: string
  name: string
  startDate: string
  endDate: string
  status: PeriodStatus
  closedAt?: string
  closedBy?: string
  createdAt: string
  updatedAt: string
}

export interface FinanceSummary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  totalTax: number
  totalCommissions: number
  pendingSettlements: number
  openInvoices: number
  period: { start: string; end: string }
}

export interface TaxCalculationRequest {
  amount: number
  taxRuleId?: string
  jurisdiction?: string
  type?: TaxType
}

export interface TaxCalculationResult {
  baseAmount: number
  taxRate: number
  taxAmount: number
  total: number
  rule: ITaxRule | null
}

export interface CreateJournalEntryRequest {
  description: string
  reference?: string
  referenceType?: string
  referenceId?: string
  lines: { accountCode: string; debit: number; credit: number; description?: string }[]
}

export interface CreateInvoiceRequest {
  type: InvoiceType
  issuedTo?: string
  vendorId?: string
  orderId?: string
  items: Omit<IInvoiceItem, 'subtotal' | 'total' | 'taxAmount'>[]
  currency?: string
  notes?: string
  dueDate?: string
}

export interface SettlementCreateRequest {
  vendorId: string
  periodStart: string
  periodEnd: string
}
