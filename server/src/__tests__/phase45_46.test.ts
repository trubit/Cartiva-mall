import { describe, it, expect } from 'vitest'
import {
  listOptimizationTargets,
  detectOptimizationOpportunities,
  listOptimizationProposals,
  applyOptimizationProposal,
  rollbackOptimizationProposal,
} from '../modules/optimization/optimization.service.js'
import { listWorkflows } from '../modules/workflow/workflow.service.js'

describe('Phase 45 & Phase 46 Enterprise Microservices Suite (Workflows & Self-Optimization)', () => {
  describe('Phase 45: Workflow Orchestration & Business Automation Engine', () => {
    it('should list active workflow definitions cleanly', async () => {
      const res = await listWorkflows(1, 10)
      expect(res.page).toBe(1)
      expect(Array.isArray(res.items)).toBe(true)
    })
  })

  describe('Phase 46: Self-Optimization & Adaptive Intelligence Platform', () => {
    it('should seed and retrieve pre-approved optimization targets', async () => {
      const targets = await listOptimizationTargets()
      expect(targets.length).toBeGreaterThanOrEqual(2)
      const productTarget = targets.find((t) => t.targetKey === 'cache_ttl_products')
      expect(productTarget).toBeDefined()
      expect(productTarget?.minSafeValue).toBe(60)
    })

    it('should detect optimization opportunities and create structured proposal', async () => {
      await detectOptimizationOpportunities()
      const res = await listOptimizationProposals('PROPOSED', 1, 10)
      expect(res.proposals.length).toBeGreaterThan(0)
      const proposal = res.proposals[0]
      expect(proposal?.targetKey).toBe('cache_ttl_products')
      expect(proposal?.riskScore).toBeLessThanOrEqual(30)
    })

    it('should safely apply an approved proposal and track experiment', async () => {
      const res = await listOptimizationProposals('PROPOSED', 1, 10)
      const proposal = res.proposals[0]
      if (proposal) {
        const updated = await applyOptimizationProposal(proposal.proposalId)
        expect(updated.status).toBe('APPLIED')
        expect(updated.appliedAt).toBeDefined()

        // Rollback test
        const rolledBack = await rollbackOptimizationProposal(
          proposal.proposalId,
          'Test safety rollback',
        )
        expect(rolledBack.status).toBe('ROLLED_BACK')
        expect(rolledBack.rollbackReason).toBe('Test safety rollback')
      }
    })
  })
})
