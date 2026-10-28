import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app.js'
import fs from 'fs'
import path from 'path'

describe('Homepage, Routing & Health Regression Suite', () => {
  it('GET /health returns 200 and JSON status report', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('checks')
    expect(res.body.checks).toHaveProperty('mongodb')
    expect(res.body.checks).toHaveProperty('redis')
  })

  it('GET /api/v1/health returns 200 and matches explicit health endpoint', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body.success).toBe(true)
  })

  it('GET /ready returns JSON readiness status', async () => {
    const res = await request(app).get('/ready')
    expect([200, 503]).toContain(res.status)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('checks')
  })

  it('GET / never returns 404 Route Not Found', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)

    const clientDistPath = path.resolve(process.cwd(), 'dist')
    const hasClientBuild = fs.existsSync(path.join(clientDistPath, 'index.html'))

    if (hasClientBuild) {
      expect(res.headers['content-type']).toMatch(/html/)
      expect(res.text).toContain('<html')
    } else {
      expect(res.headers['content-type']).toMatch(/json/)
      expect(res.body.success).toBe(true)
    }
  })

  it('GET non-API client routes serve index.html or proper response without 404 API error', async () => {
    const clientDistPath = path.resolve(process.cwd(), 'dist')
    const hasClientBuild = fs.existsSync(path.join(clientDistPath, 'index.html'))

    const res = await request(app).get('/products')

    if (hasClientBuild) {
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toMatch(/html/)
      expect(res.text).toContain('<html')
    } else {
      expect([200, 404]).toContain(res.status)
    }
  })

  it('GET unknown API endpoint returns structured JSON 404 and NOT HTML fallback', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-regression-test')
    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toHaveProperty('success', false)
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND')
    expect(res.body.error.message).toContain(
      'Endpoint GET /api/v1/unknown-endpoint-regression-test not found',
    )
  })

  it('POST unknown API endpoint returns structured JSON 404 and NOT HTML fallback', async () => {
    const res = await request(app).post('/api/v1/unknown-post-endpoint').send({ test: true })
    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
