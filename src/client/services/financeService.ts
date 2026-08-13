import api from './api.js'

export const financeApi = {
  getSummary: (start?: string, end?: string) =>
    api.get('/finance/summary', { params: { start, end } }),
  getAccounts: () => api.get('/finance/accounts'),

  listJournalEntries: (params?: Record<string, unknown>) => api.get('/finance/journal', { params }),
  createJournalEntry: (data: unknown) => api.post('/finance/journal', data),
  reverseJournalEntry: (id: string) => api.post(`/finance/journal/${id}/reverse`),

  getLedger: (params?: Record<string, unknown>) => api.get('/finance/ledger', { params }),

  listInvoices: (params?: Record<string, unknown>) => api.get('/finance/invoices', { params }),
  createInvoice: (data: unknown) => api.post('/finance/invoices', data),
  getInvoice: (id: string) => api.get(`/finance/invoices/${id}`),

  calculateTax: (data: unknown) => api.post('/finance/taxes/calculate', data),
  listTaxRules: () => api.get('/finance/taxes/rules'),
  createTaxRule: (data: unknown) => api.post('/finance/taxes/rules', data),

  createSettlement: (data: unknown) => api.post('/finance/settlements', data),
  listSettlements: (params?: Record<string, unknown>) =>
    api.get('/finance/settlements', { params }),

  getReconciliation: (start?: string, end?: string) =>
    api.get('/finance/reconciliation', { params: { start, end } }),

  generateReport: (data: unknown) => api.post('/finance/reports', data),
  listReports: (params?: Record<string, unknown>) => api.get('/finance/reports', { params }),

  getAuditTrail: (params?: Record<string, unknown>) => api.get('/finance/audit', { params }),
  getAccountingPeriods: () => api.get('/finance/periods'),
  closePeriod: (id: string) => api.post(`/finance/periods/${id}/close`),
}
