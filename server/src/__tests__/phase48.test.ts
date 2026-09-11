import { describe, it, expect } from 'vitest'
import {
  recordBusinessSignal,
  createProposal,
  simulateDecision,
  approveProposal,
  executeDecisionAction,
  rollbackDecisionAction,
  toggleKillSwitch,
  getOrCreatePolicy,
} from '../modules/autonomy/autonomy.service.js'

describe('Phase 48: Autonomous Business Economy & Controlled Decision Automation Suite', () => {
  describe('Business Signals & Policy Initialization', () => {
    it('should initialize autonomy policy with default budgets and kill switches disabled', async () => {
      const policy = await getOrCreatePolicy()
      expect(policy.policyVersion).toBe('v1.0.0')
      expect(policy.globalKillSwitch).toBe(false)
      expect(policy.budgets.maxActionsPerHour).toBeGreaterThan(0)
    })

    it('should record business signals correctly', async () => {
      const signal = await recordBusinessSignal({
        signalType: 'low_inventory',
        sourceModule: 'Inventory',
        severity: 'high',
        value: 3,
        threshold: 10,
      })
      expect(signal._id).toBeDefined()
      expect(signal.signalType).toBe('low_inventory')
      expect(signal.severity).toBe('high')
    })
  })

  describe('Decision Proposals & Security Guardrails', () => {
    it('should create proposal for allowlisted safe action', async () => {
      const proposal = await createProposal({
        objective: 'INVENTORY_EFFICIENCY',
        actionName: 'create_restock_recommendation',
        reason: 'Stock levels fell below safety threshold',
      })
      expect(proposal.decisionId).toBeDefined()
      expect(proposal.actionName).toBe('create_restock_recommendation')
      expect(proposal.riskLevel).toBe('LOW')
    })

    it('should block creation of proposals for forbidden autonomous actions', async () => {
      await expect(
        createProposal({
          objective: 'FINANCIAL_MUTATION',
          actionName: 'transfer_money',
          reason: 'Attempting restricted operation',
        }),
      ).rejects.toThrow(/Forbidden autonomous action/)
    })

    it('should enforce max chain depth to prevent infinite autonomous loops', async () => {
      const prop1 = await createProposal({
        objective: 'INVENTORY_EFFICIENCY',
        actionName: 'create_restock_recommendation',
        reason: 'Chain depth test 1',
      })
      const prop2 = await createProposal({
        objective: 'INVENTORY_EFFICIENCY',
        actionName: 'create_restock_recommendation',
        reason: 'Chain depth test 2',
        parentDecisionId: prop1.decisionId,
      })
      const prop3 = await createProposal({
        objective: 'INVENTORY_EFFICIENCY',
        actionName: 'create_restock_recommendation',
        reason: 'Chain depth test 3',
        parentDecisionId: prop2.decisionId,
      })

      // 4th link in chain exceeds max chain depth of 3
      await expect(
        createProposal({
          objective: 'INVENTORY_EFFICIENCY',
          actionName: 'create_restock_recommendation',
          reason: 'Chain depth test 4',
          parentDecisionId: prop3.decisionId,
        }),
      ).rejects.toThrow(/exceeds maximum allowed limit/)
    })
  })

  describe('Dry-Run Simulation & Human Approvals', () => {
    it('should perform non-mutating simulation of decision proposal', async () => {
      const proposal = await createProposal({
        objective: 'OPERATIONAL_EFFICIENCY',
        actionName: 'notify_admin',
        reason: 'Simulation test',
      })
      const sim = await simulateDecision(proposal.decisionId)
      expect(sim.simulationMode).toBe('dry_run')
      expect(sim.isProductionMutated).toBe(false)
      expect(sim.decisionId).toBe(proposal.decisionId)
    })

    it('should approve proposal and update state to APPROVED', async () => {
      const proposal = await createProposal({
        objective: 'OPERATIONAL_EFFICIENCY',
        actionName: 'adjust_cache_parameter',
        reason: 'Approval test',
      })
      const approved = await approveProposal(proposal.decisionId, '507f1f77bcf86cd799439011')
      expect(approved.status).toBe('APPROVED')
    })
  })

  describe('Execution, Idempotency & Rollback', () => {
    it('should execute approved decision action and generate execution record', async () => {
      const proposal = await createProposal({
        objective: 'INVENTORY_EFFICIENCY',
        actionName: 'create_restock_recommendation',
        reason: 'Execution test',
      })
      const exec = await executeDecisionAction(proposal.decisionId)
      expect(exec.status).toBe('completed')
      expect(exec.idempotencyKey).toBe(`exec_${proposal.decisionId}`)
    })

    it('should roll back executed decision cleanly', async () => {
      const proposal = await createProposal({
        objective: 'INVENTORY_EFFICIENCY',
        actionName: 'create_restock_recommendation',
        reason: 'Rollback test',
      })
      await executeDecisionAction(proposal.decisionId)
      const res = await rollbackDecisionAction(proposal.decisionId)
      expect(res.status).toBe('ROLLED_BACK')
    })
  })

  describe('Kill Switch Enforcement', () => {
    it('should block autonomous proposal creation when global kill switch is active', async () => {
      await toggleKillSwitch({ global: true })
      await expect(
        createProposal({
          objective: 'INVENTORY_EFFICIENCY',
          actionName: 'create_restock_recommendation',
          reason: 'Kill switch test',
        }),
      ).rejects.toThrow(/Global autonomy kill switch is ACTIVE/)

      // Re-enable kill switch for other tests
      await toggleKillSwitch({ global: false })
    })
  })
})
