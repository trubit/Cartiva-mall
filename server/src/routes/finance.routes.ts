import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { adminLimiter, dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as ctrl from '../modules/finance/finance.controller.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))
router.use(adminLimiter)

router.get('/summary', ctrl.getSummary)

router.get('/accounts', ctrl.listAccounts)

router.post('/journal', ctrl.createJournalEntry)
router.get('/journal', ctrl.listJournalEntries)
router.post('/journal/:id/reverse', ctrl.reverseJournalEntry)

router.get('/ledger', ctrl.getLedger)

router.post('/invoices', ctrl.createInvoice)
router.get('/invoices', ctrl.listInvoices)
router.get('/invoices/:id', ctrl.getInvoice)

router.post('/taxes/calculate', ctrl.calculateTax)
router.get('/taxes/rules', ctrl.listTaxRules)
router.post('/taxes/rules', ctrl.createTaxRule)

router.post('/settlements', ctrl.createSettlement)
router.get('/settlements', ctrl.listSettlements)

router.get('/reconciliation', dashboardLimiter, ctrl.getReconciliation)

router.post('/reports', ctrl.generateReport)
router.get('/reports', ctrl.listReports)

router.get('/audit', ctrl.getAuditTrail)

router.get('/periods', ctrl.getAccountingPeriods)
router.post('/periods/:id/close', ctrl.closePeriod)

export default router
