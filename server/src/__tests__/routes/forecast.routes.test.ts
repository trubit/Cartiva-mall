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
  dashboardLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

const mockForecast = { type: 'sales_daily', dataPoints: [], confidenceScore: 80 }

vi.mock('../../modules/forecast/forecast.controller.js', () => ({
  getSalesForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getInventoryForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getCustomerForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getProductForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getVendorForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getLogisticsForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getFinanceForecast: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: mockForecast }),
  getRecommendations: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  runScenario: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: [] }),
  getForecastHistory: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
}))

import forecastRoutes from '../../routes/forecast.routes.js'

const app = express()
app.use(express.json())
app.use('/api/v1/forecast', forecastRoutes)
app.use(errorHandler)

describe('Forecast Routes', () => {
  it('GET /forecast/sales returns forecast data', async () => {
    const res = await request(app).get('/api/v1/forecast/sales')
    expect(res.status).toBe(200)
    expect(res.body.data.confidenceScore).toBe(80)
  })

  it('GET /forecast/inventory returns 200', async () => {
    const res = await request(app).get('/api/v1/forecast/inventory')
    expect(res.status).toBe(200)
  })

  it('GET /forecast/recommendations returns 200', async () => {
    const res = await request(app).get('/api/v1/forecast/recommendations')
    expect(res.status).toBe(200)
  })

  it('POST /forecast/scenario returns scenario results', async () => {
    const res = await request(app)
      .post('/api/v1/forecast/scenario')
      .send({ type: 'sales_daily', scenarios: [{ name: 'optimistic', adjustmentFactor: 1.2 }] })
    expect(res.status).toBe(200)
  })

  it('GET /forecast/history returns 200', async () => {
    const res = await request(app).get('/api/v1/forecast/history')
    expect(res.status).toBe(200)
  })
})
