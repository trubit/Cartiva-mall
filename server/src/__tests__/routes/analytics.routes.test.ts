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

vi.mock('../../modules/analytics/analytics.controller.js', () => ({
  getDashboard: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getSales: (_req: express.Request, res: express.Response) => res.json({ success: true, data: {} }),
  getCustomers: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getVendors: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  getProducts: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  getInventory: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getFinance: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getLogistics: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  createReport: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  listReports: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  getReport: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  exportReport: (_req: express.Request, res: express.Response) => res.send('csv data'),
}))

import analyticsRoutes from '../../routes/analytics.routes.js'

const app = express()
app.use(express.json())
app.use('/api/v1/analytics', analyticsRoutes)
app.use(errorHandler)

describe('Analytics Routes', () => {
  it('GET /analytics/dashboard returns 200', async () => {
    const res = await request(app).get('/api/v1/analytics/dashboard')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('GET /analytics/sales returns 200', async () => {
    const res = await request(app).get('/api/v1/analytics/sales')
    expect(res.status).toBe(200)
  })

  it('GET /analytics/customers returns 200', async () => {
    const res = await request(app).get('/api/v1/analytics/customers')
    expect(res.status).toBe(200)
  })

  it('GET /analytics/vendors returns 200', async () => {
    const res = await request(app).get('/api/v1/analytics/vendors')
    expect(res.status).toBe(200)
  })

  it('GET /analytics/inventory returns 200', async () => {
    const res = await request(app).get('/api/v1/analytics/inventory')
    expect(res.status).toBe(200)
  })

  it('POST /analytics/reports returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/reports')
      .send({ title: 'Test', type: 'sales' })
    expect(res.status).toBe(201)
  })
})
