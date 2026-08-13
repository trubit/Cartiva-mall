import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { errorHandler } from '../../middlewares/error.middleware.js'

vi.mock('../../middlewares/auth.middleware.js', () => ({
  authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(_req as express.Request & { user: { userId: string; email: string; role: string } }).user = {
      userId: 'admin-id',
      email: 'admin@test.com',
      role: 'admin',
    }
    next()
  },
  authorize:
    (..._roles: string[]) =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}))

vi.mock('../../middlewares/rateLimiter.middleware.js', () => ({
  adminLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  dashboardLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

vi.mock('../../modules/finance/finance.controller.js', () => ({
  getSummary: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  listAccounts: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createJournalEntry: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  listJournalEntries: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  reverseJournalEntry: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getLedger: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createInvoice: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  listInvoices: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  getInvoice: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  calculateTax: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { taxAmount: 7.5 } }),
  listTaxRules: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  createTaxRule: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  createSettlement: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  listSettlements: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  getReconciliation: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  generateReport: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  listReports: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  getAuditTrail: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  getAccountingPeriods: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  closePeriod: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'closed' }),
}))

import financeRoutes from '../../routes/finance.routes.js'

const app = express()
app.use(express.json())
app.use('/api/v1/finance', financeRoutes)
app.use(errorHandler)

describe('Finance Routes', () => {
  it('GET /finance/summary returns 200', async () => {
    const res = await request(app).get('/api/v1/finance/summary')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('GET /finance/accounts returns 200', async () => {
    const res = await request(app).get('/api/v1/finance/accounts')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('POST /finance/journal returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/finance/journal')
      .send({ description: 'Test', lines: [] })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('GET /finance/ledger returns 200', async () => {
    const res = await request(app).get('/api/v1/finance/ledger')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('POST /finance/invoices returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/finance/invoices')
      .send({ type: 'sale', items: [] })
    expect(res.status).toBe(201)
  })

  it('POST /finance/taxes/calculate returns tax amount', async () => {
    const res = await request(app).post('/api/v1/finance/taxes/calculate').send({ amount: 100 })
    expect(res.status).toBe(200)
    expect(res.body.data.taxAmount).toBeDefined()
  })

  it('GET /finance/reconciliation returns 200', async () => {
    const res = await request(app).get('/api/v1/finance/reconciliation')
    expect(res.status).toBe(200)
  })

  it('GET /finance/audit returns 200', async () => {
    const res = await request(app).get('/api/v1/finance/audit')
    expect(res.status).toBe(200)
  })
})
