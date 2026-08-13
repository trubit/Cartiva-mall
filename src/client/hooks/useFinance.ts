import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '../services/financeService.js'

const KEYS = {
  summary: (s?: string, e?: string) => ['finance', 'summary', s, e] as const,
  accounts: () => ['finance', 'accounts'] as const,
  journal: (p: Record<string, unknown>) => ['finance', 'journal', p] as const,
  ledger: (p: Record<string, unknown>) => ['finance', 'ledger', p] as const,
  invoices: (p: Record<string, unknown>) => ['finance', 'invoices', p] as const,
  invoice: (id: string) => ['finance', 'invoice', id] as const,
  settlements: (p: Record<string, unknown>) => ['finance', 'settlements', p] as const,
  reconciliation: (s?: string, e?: string) => ['finance', 'reconciliation', s, e] as const,
  reports: (p: Record<string, unknown>) => ['finance', 'reports', p] as const,
  audit: (p: Record<string, unknown>) => ['finance', 'audit', p] as const,
  taxRules: () => ['finance', 'taxRules'] as const,
  periods: () => ['finance', 'periods'] as const,
}

export const useFinanceSummary = (start?: string, end?: string) =>
  useQuery({
    queryKey: KEYS.summary(start, end),
    queryFn: () => financeApi.getSummary(start, end).then((r) => r.data.data),
    staleTime: 60000,
    retry: false,
  })

export const useAccounts = () =>
  useQuery({
    queryKey: KEYS.accounts(),
    queryFn: () => financeApi.getAccounts().then((r) => r.data.data),
  })

export const useJournalEntries = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.journal(params),
    queryFn: () => financeApi.listJournalEntries(params).then((r) => r.data),
    retry: false,
  })

export const useCreateJournalEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => financeApi.createJournalEntry(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'journal'] }),
  })
}

export const useLedger = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.ledger(params),
    queryFn: () => financeApi.getLedger(params).then((r) => r.data.data),
    retry: false,
  })

export const useInvoices = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.invoices(params),
    queryFn: () => financeApi.listInvoices(params).then((r) => r.data),
    retry: false,
  })

export const useInvoice = (id: string) =>
  useQuery({
    queryKey: KEYS.invoice(id),
    queryFn: () => financeApi.getInvoice(id).then((r) => r.data.data),
    enabled: !!id,
  })

export const useCreateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => financeApi.createInvoice(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

export const useSettlements = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.settlements(params),
    queryFn: () => financeApi.listSettlements(params).then((r) => r.data),
    retry: false,
  })

export const useCreateSettlement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => financeApi.createSettlement(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'settlements'] }),
  })
}

export const useReconciliation = (start?: string, end?: string) =>
  useQuery({
    queryKey: KEYS.reconciliation(start, end),
    queryFn: () => financeApi.getReconciliation(start, end).then((r) => r.data.data),
    retry: false,
  })

export const useFinanceReports = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.reports(params),
    queryFn: () => financeApi.listReports(params).then((r) => r.data),
    retry: false,
  })

export const useGenerateReport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => financeApi.generateReport(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'reports'] }),
  })
}

export const useAuditTrail = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: KEYS.audit(params),
    queryFn: () => financeApi.getAuditTrail(params).then((r) => r.data),
    retry: false,
  })

export const useTaxRules = () =>
  useQuery({
    queryKey: KEYS.taxRules(),
    queryFn: () => financeApi.listTaxRules().then((r) => r.data.data),
  })

export const useAccountingPeriods = () =>
  useQuery({
    queryKey: KEYS.periods(),
    queryFn: () => financeApi.getAccountingPeriods().then((r) => r.data.data),
  })

export const useClosePeriod = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeApi.closePeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'periods'] }),
  })
}
