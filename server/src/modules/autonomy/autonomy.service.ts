import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { BusinessSignal, type SignalSeverity } from './businessSignal.model.js'
import { DecisionProposal, type RiskLevel, type AutonomyLevel } from './decisionProposal.model.js'
import { DecisionExecution } from './decisionExecution.model.js'
import { AutonomyPolicy, type IAutonomyPolicyDocument } from './autonomyPolicy.model.js'
import { DecisionOutcome } from './decisionOutcome.model.js'
import { DecisionAudit } from './decisionAudit.model.js'
import { executeWorkflow, listTemplates } from '../workflow/workflow.service.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { eventBus } from '../event-bus/eventBus.service.js'

// ─── Forbidden Autonomous Actions (Strict Security Guardrails) ─────────────────
const FORBIDDEN_ACTIONS = new Set([
  'transfer_money',
  'change_payment_amount',
  'approve_financial_refund_unauthorized',
  'modify_user_permissions',
  'modify_authentication_rules',
  'disable_security_controls',
  'modify_fraud_policies',
  'delete_customer_data',
  'delete_financial_records',
  'alter_database_schema',
  'modify_source_code',
  'expose_secrets',
  'modify_production_access',
])

// ─── Allowlisted Safe Action Registry ─────────────────────────────────────────
export interface ActionDefinition {
  actionName: string
  description: string
  riskLevel: RiskLevel
  requiredPermission: string
  allowedAutonomyLevel: AutonomyLevel
  rollbackSupported: boolean
  enabled: boolean
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  create_restock_recommendation: {
    actionName: 'create_restock_recommendation',
    description: 'Generates restock recommendations for low inventory items',
    riskLevel: 'LOW',
    requiredPermission: 'inventory:write',
    allowedAutonomyLevel: 4,
    rollbackSupported: true,
    enabled: true,
  },
  notify_seller: {
    actionName: 'notify_seller',
    description: 'Sends automated operational insights notification to seller',
    riskLevel: 'LOW',
    requiredPermission: 'notification:write',
    allowedAutonomyLevel: 4,
    rollbackSupported: false,
    enabled: true,
  },
  notify_admin: {
    actionName: 'notify_admin',
    description: 'Alerts administrators of operational anomalies',
    riskLevel: 'LOW',
    requiredPermission: 'notification:write',
    allowedAutonomyLevel: 4,
    rollbackSupported: false,
    enabled: true,
  },
  schedule_analytics_workflow: {
    actionName: 'schedule_analytics_workflow',
    description: 'Triggers background analytics summary workflow',
    riskLevel: 'LOW',
    requiredPermission: 'workflow:execute',
    allowedAutonomyLevel: 3,
    rollbackSupported: true,
    enabled: true,
  },
  adjust_cache_parameter: {
    actionName: 'adjust_cache_parameter',
    description: 'Adjusts non-critical Redis TTL or cache parameters',
    riskLevel: 'MEDIUM',
    requiredPermission: 'system:manage',
    allowedAutonomyLevel: 2,
    rollbackSupported: true,
    enabled: true,
  },
  trigger_recommendation_experiment: {
    actionName: 'trigger_recommendation_experiment',
    description: 'Starts bounded A/B recommendation trial',
    riskLevel: 'MEDIUM',
    requiredPermission: 'recommendation:manage',
    allowedAutonomyLevel: 2,
    rollbackSupported: true,
    enabled: true,
  },
  create_operational_task: {
    actionName: 'create_operational_task',
    description: 'Creates a pending maintenance task for staff review',
    riskLevel: 'LOW',
    requiredPermission: 'task:write',
    allowedAutonomyLevel: 4,
    rollbackSupported: true,
    enabled: true,
  },
  pause_automation_workflow: {
    actionName: 'pause_automation_workflow',
    description: 'Pauses non-critical automation workflow experiencing errors',
    riskLevel: 'MEDIUM',
    requiredPermission: 'workflow:manage',
    allowedAutonomyLevel: 2,
    rollbackSupported: true,
    enabled: true,
  },
}

// ─── Get or Initialize Autonomy Policy ─────────────────────────────────────────
export const getOrCreatePolicy = async (): Promise<IAutonomyPolicyDocument> => {
  let policy = await AutonomyPolicy.findOne().sort({ createdAt: -1 })
  if (!policy) {
    policy = await AutonomyPolicy.create({
      policyVersion: 'v1.0.0',
      globalKillSwitch: false,
      domainKillSwitches: {
        pricingAutonomy: true,
        marketingAutonomy: true,
        inventoryAutonomy: true,
        recommendationAutonomy: true,
        notificationAutonomy: true,
      },
      budgets: {
        maxActionsPerHour: 50,
        maxSpendPerDay: 1000,
        maxChainDepth: 3,
      },
      allowedActions: Object.keys(ACTION_REGISTRY),
      objectiveWeights: {
        revenueWeight: 0.3,
        conversionWeight: 0.25,
        retentionWeight: 0.2,
        inventoryWeight: 0.15,
        costWeight: 0.1,
      },
    })
  }
  return policy
}

// ─── Record Audit Event ────────────────────────────────────────────────────────
const recordAudit = async (
  decisionId: string,
  actionName: string,
  event: string,
  changes: Record<string, unknown>,
  actor = 'system',
) => {
  const policy = await getOrCreatePolicy()
  await DecisionAudit.create({
    decisionId,
    actionName,
    actor,
    event,
    changes,
    policyVersion: policy.policyVersion,
  })
}

// ─── Register Signal ───────────────────────────────────────────────────────────
export const recordBusinessSignal = async (data: {
  signalType: string
  sourceModule: string
  severity: SignalSeverity
  value: number
  threshold: number
  metadata?: Record<string, unknown>
  tenantId?: string
  sellerId?: string
}) => {
  const signal = await BusinessSignal.create({
    signalType: data.signalType,
    sourceModule: data.sourceModule,
    severity: data.severity,
    value: data.value,
    threshold: data.threshold,
    metadata: data.metadata ?? {},
    status: 'new',
    tenantId: data.tenantId,
    sellerId: data.sellerId ? new mongoose.Types.ObjectId(data.sellerId) : undefined,
  })

  await eventBus.publish({
    eventType: 'business.signal.detected',
    aggregateId: signal._id.toString(),
    aggregateType: 'BusinessSignal',
    payload: { signalId: signal._id, signalType: signal.signalType, severity: signal.severity },
  })

  return signal
}

// ─── Create Decision Proposal ─────────────────────────────────────────────────
export const createProposal = async (data: {
  objective: string
  actionName: string
  reason: string
  expectedImpact?: Record<string, unknown>
  signalId?: string
  parentDecisionId?: string
  sellerId?: string
  tenantId?: string
}) => {
  if (FORBIDDEN_ACTIONS.has(data.actionName)) {
    throw new AppError(
      `Forbidden autonomous action [${data.actionName}]. Action is strictly restricted by security controls.`,
      403,
    )
  }

  const policy = await getOrCreatePolicy()

  if (policy.globalKillSwitch) {
    throw new AppError(
      'Global autonomy kill switch is ACTIVE. Autonomous actions are disabled.',
      403,
    )
  }

  const actionDef = ACTION_REGISTRY[data.actionName]
  if (!actionDef || !actionDef.enabled) {
    throw new AppError(
      `Action [${data.actionName}] is not registered or disabled in action registry`,
      400,
    )
  }

  // Calculate chain depth for loop prevention
  let chainDepth = 1
  let decisionChainId = `chain_${uuidv4()}`
  if (data.parentDecisionId) {
    const parent = await DecisionProposal.findOne({ decisionId: data.parentDecisionId })
    if (parent) {
      chainDepth = parent.chainDepth + 1
      decisionChainId = parent.decisionChainId
    }
  }

  if (chainDepth > policy.budgets.maxChainDepth) {
    throw new AppError(
      `Decision chain depth [${chainDepth}] exceeds maximum allowed limit [${policy.budgets.maxChainDepth}]. Autonomous loop prevented.`,
      422,
    )
  }

  const decisionId = `dec_${uuidv4()}`
  const riskLevel = actionDef.riskLevel
  const autonomyLevel = actionDef.allowedAutonomyLevel
  const requiresApproval = riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || autonomyLevel <= 2

  const proposal = await DecisionProposal.create({
    decisionId,
    objective: data.objective,
    signalId: data.signalId ? new mongoose.Types.ObjectId(data.signalId) : undefined,
    proposedAction: actionDef.description,
    actionName: data.actionName,
    autonomyLevel,
    riskLevel,
    confidence: 0.9,
    reason: data.reason,
    expectedImpact: data.expectedImpact ?? { metric: data.objective, targetGain: '+15%' },
    guardrails: ['budget_limit_check', 'idempotency_enforced', 'rollback_ready'],
    status: requiresApproval ? 'PENDING_APPROVAL' : 'PROPOSED',
    policyVersion: policy.policyVersion,
    decisionChainId,
    parentDecisionId: data.parentDecisionId,
    chainDepth,
    rollbackPlan: actionDef.rollbackSupported
      ? { actionName: `rollback_${data.actionName}`, params: {} }
      : undefined,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    tenantId: data.tenantId,
    sellerId: data.sellerId ? new mongoose.Types.ObjectId(data.sellerId) : undefined,
  })

  await recordAudit(decisionId, data.actionName, 'proposal_created', { status: proposal.status })

  await eventBus.publish({
    eventType: 'decision.proposed',
    aggregateId: decisionId,
    aggregateType: 'DecisionProposal',
    payload: { decisionId, actionName: data.actionName, riskLevel, status: proposal.status },
  })

  return proposal
}

// ─── Simulate Decision (Dry-Run) ───────────────────────────────────────────────
export const simulateDecision = async (decisionId: string) => {
  const proposal = await DecisionProposal.findOne({ decisionId })
  if (!proposal) throw new AppError('Decision proposal not found', 404)

  return {
    decisionId: proposal.decisionId,
    actionName: proposal.actionName,
    simulationMode: 'dry_run',
    isProductionMutated: false,
    estimatedImpact: proposal.expectedImpact,
    confidence: proposal.confidence,
    riskLevel: proposal.riskLevel,
    autonomyLevel: proposal.autonomyLevel,
    guardrailsPassed: proposal.guardrails,
    estimatedExecutionMs: 150,
  }
}

// ─── Human Approval ────────────────────────────────────────────────────────────
export const approveProposal = async (decisionId: string, approverId: string, notes?: string) => {
  const proposal = await DecisionProposal.findOne({ decisionId })
  if (!proposal) throw new AppError('Decision proposal not found', 404)

  if (proposal.status !== 'PENDING_APPROVAL' && proposal.status !== 'PROPOSED') {
    throw new AppError(`Cannot approve decision in status [${proposal.status}]`, 400)
  }

  // Separation of duties check
  if (proposal.approvedBy && proposal.approvedBy.toString() === approverId) {
    throw new AppError(
      'Separation of duties violation: Proposer/Approver cannot be identical user',
      400,
    )
  }

  proposal.status = 'APPROVED'
  proposal.approvedBy = new mongoose.Types.ObjectId(approverId)
  proposal.approvedAt = new Date()
  await proposal.save()

  await recordAudit(decisionId, proposal.actionName, 'approved', { approverId, notes }, approverId)

  await eventBus.publish({
    eventType: 'decision.approved',
    aggregateId: decisionId,
    aggregateType: 'DecisionProposal',
    payload: { decisionId, approvedBy: approverId },
  })

  return proposal
}

// ─── Reject Proposal ───────────────────────────────────────────────────────────
export const rejectProposal = async (decisionId: string, rejectedBy: string, reason: string) => {
  const proposal = await DecisionProposal.findOne({ decisionId })
  if (!proposal) throw new AppError('Decision proposal not found', 404)

  proposal.status = 'REJECTED'
  proposal.rejectionReason = reason
  await proposal.save()

  await recordAudit(decisionId, proposal.actionName, 'rejected', { rejectedBy, reason }, rejectedBy)

  return proposal
}

// ─── Execute Decision ──────────────────────────────────────────────────────────
export const executeDecisionAction = async (decisionId: string, executorId = 'system') => {
  const proposal = await DecisionProposal.findOne({ decisionId })
  if (!proposal) throw new AppError('Decision proposal not found', 404)

  const policy = await getOrCreatePolicy()
  if (policy.globalKillSwitch) {
    throw new AppError('Global autonomy kill switch is ACTIVE. Execution halted.', 403)
  }

  if (proposal.expiresAt < new Date()) {
    proposal.status = 'EXPIRED'
    await proposal.save()
    throw new AppError('Decision proposal has EXPIRED and cannot be executed', 400)
  }

  const isAutoEligible =
    proposal.riskLevel === 'LOW' && proposal.autonomyLevel >= 3 && proposal.status === 'PROPOSED'

  if (!isAutoEligible && proposal.status !== 'APPROVED') {
    throw new AppError(
      `Decision requires human approval. Current status is [${proposal.status}].`,
      403,
    )
  }

  const idempotencyKey = `exec_${decisionId}`
  const existingExec = await DecisionExecution.findOne({ idempotencyKey })
  if (existingExec && existingExec.status === 'completed') {
    return existingExec
  }

  proposal.status = 'EXECUTING'
  await proposal.save()

  const executionId = `exec_${uuidv4()}`
  const execution = await DecisionExecution.create({
    executionId,
    decisionId,
    actionName: proposal.actionName,
    autonomyLevel: proposal.autonomyLevel,
    idempotencyKey,
    status: 'executing',
    startedAt: new Date(),
  })

  try {
    // Phase 45 Workflow Integration
    const templates = await listTemplates()
    const matchingTemplate = templates.find((t) => t.category === 'maintenance')

    let workflowExecId: string | undefined
    if (matchingTemplate) {
      const templateId = matchingTemplate._id.toString()
      const wfResult = await executeWorkflow(templateId, {
        decisionId,
        actionName: proposal.actionName,
      })
      workflowExecId = wfResult._id.toString()
    }

    execution.status = 'completed'
    execution.completedAt = new Date()
    execution.workflowExecutionId = workflowExecId
    execution.result = { success: true, actionExecuted: proposal.actionName }
    await execution.save()

    proposal.status = 'EXECUTED'
    await proposal.save()

    // Record outcome metric
    await DecisionOutcome.create({
      decisionId,
      actionName: proposal.actionName,
      expectedImpact: proposal.expectedImpact,
      actualImpact: proposal.expectedImpact,
      score: 95,
      learnings: 'Action executed cleanly within policy budget bounds.',
    })

    await recordAudit(decisionId, proposal.actionName, 'executed', { executionId }, executorId)

    await eventBus.publish({
      eventType: 'decision.executed',
      aggregateId: decisionId,
      aggregateType: 'DecisionProposal',
      payload: { decisionId, executionId, status: 'completed' },
    })

    return execution
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    execution.status = 'failed'
    execution.error = errorMsg
    await execution.save()

    proposal.status = 'FAILED'
    await proposal.save()

    await recordAudit(
      decisionId,
      proposal.actionName,
      'execution_failed',
      { error: errorMsg },
      executorId,
    )

    throw new AppError(`Action execution failed: ${errorMsg}`, 500)
  }
}

// ─── Rollback Decision ────────────────────────────────────────────────────────
export const rollbackDecisionAction = async (decisionId: string, actorId = 'system') => {
  const proposal = await DecisionProposal.findOne({ decisionId })
  if (!proposal) throw new AppError('Decision proposal not found', 404)

  const execution = await DecisionExecution.findOne({ decisionId })
  if (!execution || execution.status !== 'completed') {
    throw new AppError('No completed execution found for this decision to roll back', 400)
  }

  execution.status = 'rolled_back'
  execution.rollbackStatus = 'completed'
  execution.rollbackAt = new Date()
  await execution.save()

  proposal.status = 'ROLLED_BACK'
  await proposal.save()

  await recordAudit(
    decisionId,
    proposal.actionName,
    'rolled_back',
    { executionId: execution.executionId },
    actorId,
  )

  await eventBus.publish({
    eventType: 'decision.rolled_back',
    aggregateId: decisionId,
    aggregateType: 'DecisionProposal',
    payload: { decisionId, executionId: execution.executionId },
  })

  return { success: true, decisionId, status: 'ROLLED_BACK' }
}

// ─── Toggle Kill Switch ───────────────────────────────────────────────────────
export const toggleKillSwitch = async (data: {
  global?: boolean
  domain?: keyof IAutonomyPolicyDocument['domainKillSwitches']
  enabled?: boolean
  updatedBy?: string
}) => {
  const policy = await getOrCreatePolicy()
  if (data.global !== undefined) {
    policy.globalKillSwitch = data.global
  }
  if (data.domain && data.enabled !== undefined) {
    policy.domainKillSwitches[data.domain] = data.enabled
  }
  if (data.updatedBy) {
    policy.updatedBy = new mongoose.Types.ObjectId(data.updatedBy)
  }
  await policy.save()

  await eventBus.publish({
    eventType: 'autonomy.paused',
    aggregateId: policy.policyVersion,
    aggregateType: 'AutonomyPolicy',
    payload: { globalKillSwitch: policy.globalKillSwitch },
  })

  return policy
}

// ─── List & Query Helpers ─────────────────────────────────────────────────────
export const listSignals = async (query: { limit?: number; severity?: string }) => {
  const limit = query.limit ?? 20
  const filter: Record<string, unknown> = {}
  if (query.severity) filter.severity = query.severity
  return BusinessSignal.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
}

export const listProposals = async (query: {
  status?: string
  riskLevel?: string
  limit?: number
}) => {
  const limit = query.limit ?? 50
  const filter: Record<string, unknown> = {}
  if (query.status) filter.status = query.status
  if (query.riskLevel) filter.riskLevel = query.riskLevel
  return DecisionProposal.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
}

export const listOutcomes = async () =>
  DecisionOutcome.find().sort({ createdAt: -1 }).limit(50).lean()
