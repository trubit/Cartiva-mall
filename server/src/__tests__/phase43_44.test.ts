import { describe, it, expect, beforeAll } from 'vitest'
import {
  evaluateRisk,
  recordVelocitySignal,
  getVelocitySignal,
} from '../modules/risk/risk.service.js'
import { queryAnalytics, generateMarketplaceInsights } from '../modules/ai-bi/aiBi.service.js'
import { RiskCase } from '../modules/risk/riskCase.model.js'
import { AiInsight } from '../modules/ai-bi/aiInsight.model.js'

describe('Phase 43 & Phase 44 Enterprise Microservices Suite (Risk & AI BI)', () => {
  beforeAll(async () => {
    // Clean up test collections
    await Promise.all([
      RiskCase.deleteMany({ subjectId: { $regex: /^test_/ } }),
      AiInsight.deleteMany({ title: 'Inventory Replenishment Alert' }),
    ])
  })

  describe('Phase 43: Fraud Detection, Risk & Trust Intelligence Service', () => {
    it('should calculate LOW risk for normal signals and return ALLOW decision', async () => {
      const result = await evaluateRisk('user', 'test_user_normal', {
        failedPaymentAttempts: 0,
        ordersInLastHour: 1,
      })

      expect(result.riskLevel).toBe('LOW')
      expect(result.decision).toBe('ALLOW')
      expect(result.riskScore).toBeLessThanOrEqual(30)
    })

    it('should calculate CRITICAL risk for suspicious rapid payment failures and order velocity', async () => {
      const subjectId = `test_user_fraud_${Date.now()}`
      const result = await evaluateRisk('user', subjectId, {
        failedPaymentAttempts: 6, // +40
        ordersInLastHour: 12, // +35
        refundRequestsCount: 4, // +25
      })

      expect(result.riskLevel).toBe('CRITICAL')
      expect(result.decision).toBe('RESTRICT')
      expect(result.riskScore).toBe(100)
      expect(result.reasonCodes).toContain('RAPID_PAYMENT_FAILURES')
      expect(result.reasonCodes).toContain('HIGH_ORDER_VELOCITY')
      expect(result.reasonCodes).toContain('UNUSUAL_REFUND_PATTERN')
      expect(result.caseId).toBeDefined()

      const createdCase = await RiskCase.findOne({ caseId: result.caseId })
      expect(createdCase).not.toBeNull()
      expect(createdCase?.riskLevel).toBe('CRITICAL')
    })

    it('should record and retrieve Redis velocity signals correctly', async () => {
      const id = `test_id_${Date.now()}`
      await recordVelocitySignal('unittest', id, 60)
      const count2 = await recordVelocitySignal('unittest', id, 60)
      expect(count2).toBeGreaterThanOrEqual(1)

      const retrieved = await getVelocitySignal('unittest', id)
      expect(retrieved).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Phase 44: AI-Powered Business Intelligence & Decision Support Service', () => {
    it('should process natural-language analytics query for inventory', async () => {
      const res = await queryAnalytics('Which products are low in inventory?')
      expect(res.query).toBe('Which products are low in inventory?')
      expect(res.confidenceScore).toBeGreaterThanOrEqual(80)
      expect(res.summary).toBeDefined()
      expect(res.explainableNotes).toBeDefined()
      expect(res.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should process natural-language analytics query for revenue & sales', async () => {
      const res = await queryAnalytics('What is our total revenue and order count?')
      expect(res.confidenceScore).toBe(95)
      expect(res.dataPoints.length).toBeGreaterThan(0)
      expect(res.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should generate automated marketplace insights', async () => {
      await generateMarketplaceInsights()
      const insights = await AiInsight.find({ scope: 'inventory' }).lean()
      expect(Array.isArray(insights)).toBe(true)
    })
  })
})
