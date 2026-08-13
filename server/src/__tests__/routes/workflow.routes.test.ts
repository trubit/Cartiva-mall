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

vi.mock('../../modules/workflow/workflow.controller.js', () => ({
  createWorkflow: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: { _id: 'wf1' } }),
  listWorkflows: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [], total: 0 }),
  getWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { _id: 'wf1' } }),
  updateWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  deleteWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, message: 'deleted' }),
  publishWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { status: 'active' } }),
  pauseWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { status: 'paused' } }),
  resumeWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { status: 'active' } }),
  executeWorkflow: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { status: 'running' } }),
  listExecutions: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [], total: 0 }),
  cancelExecution: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: { status: 'cancelled' } }),
  getGlobalAnalytics: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  listTemplates: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  createTemplate: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  instantiateTemplate: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  listApprovals: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  createApproval: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ success: true, data: {} }),
  processApproval: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  escalateApproval: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getWorkflowHistory: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
  getAnalytics: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, data: {} }),
  getAuditLog: (_req: express.Request, res: express.Response) =>
    res.json({ success: true, items: [] }),
}))

import workflowRoutes from '../../routes/workflow.routes.js'

const app = express()
app.use(express.json())
app.use('/api/v1/workflows', workflowRoutes)
app.use(errorHandler)

describe('Workflow Routes', () => {
  it('POST /workflows creates a workflow', async () => {
    const res = await request(app)
      .post('/api/v1/workflows')
      .send({ name: 'Test Workflow', triggerType: 'order_created', steps: [] })
    expect(res.status).toBe(201)
    expect(res.body.data._id).toBe('wf1')
  })

  it('GET /workflows returns list', async () => {
    const res = await request(app).get('/api/v1/workflows')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('GET /workflows/:id returns workflow', async () => {
    const res = await request(app).get('/api/v1/workflows/wf1')
    expect(res.status).toBe(200)
  })

  it('POST /workflows/:id/publish activates workflow', async () => {
    const res = await request(app).post('/api/v1/workflows/wf1/publish')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('active')
  })

  it('POST /workflows/:id/execute triggers execution', async () => {
    const res = await request(app).post('/api/v1/workflows/wf1/execute').send({ triggerData: {} })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('running')
  })

  it('GET /workflows/executions/list returns executions', async () => {
    const res = await request(app).get('/api/v1/workflows/executions/list')
    expect(res.status).toBe(200)
  })
})
