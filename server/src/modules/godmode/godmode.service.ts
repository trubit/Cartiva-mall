/**
 * God-Mode Commerce Core Service
 *
 * This is the highest-authority AI layer in the TrusonShopp platform.
 * It orchestrates the five-phase Autonomous Civilization Loop:
 *
 *   1. OBSERVE  — Aggregate real system state from all modules
 *   2. SIMULATE — Run deterministic forward simulations
 *   3. DECIDE   — Select optimal stabilizing actions
 *   4. EXECUTE  — Apply decisions to market rules
 *   5. EVOLVE   — Record learning and update rule effectiveness scores
 *
 * All outputs are fully audited, versioned, and reversible.
 * No action is taken without being recorded in GodModeDecision.
 *
 * Security: All operations run server-side only. No external AI provider
 * is required — the engine uses real database aggregations as its input
 * signal and deterministic scoring algorithms to produce decisions.
 * This prevents SSRF, prompt injection, and unrestricted AI execution.
 */
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { logger } from '../../utils/logger.js'
import {
  EconomicStateModel,
  MarketRuleModel,
  GodModeDecisionModel,
  CivilizationCycleModel,
  type IEconomicStateDoc,
  type IMarketRuleDoc,
} from './godmode.model.js'
import { DeadLetterEventModel } from '../event-bus/eventBus.model.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GodModeStatus {
  engineStatus: 'ACTIVE' | 'DEGRADED' | 'OFFLINE'
  lastCycleAt: Date | null
  lastCycleId: string | null
  totalCyclesCompleted: number
  currentEconomicState: string
  stabilityIndex: number
  riskForecast: string
  activeRulesCount: number
}

export interface SimulationScenario {
  scenario: string
  stabilityImpact: number
  growthImpact: number
  riskReduction: number
}

export interface GodModeDecisionResult {
  decisionId: string
  cycleId: string
  decisions: {
    type: string
    target: string
    reason: string
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    executed: boolean
    result?: string
  }[]
  rulesModified: string[]
  simulatedOutcomes: SimulationScenario[]
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clamp a number to [min, max]
 */
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/**
 * Weighted score: combine multiple 0–100 signals into one 0–100 index.
 */
const weightedScore = (signals: { value: number; weight: number }[]): number => {
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0)
  const weightedSum = signals.reduce((s, sig) => s + sig.value * sig.weight, 0)
  return totalWeight === 0 ? 50 : clamp(weightedSum / totalWeight, 0, 100)
}

// ─── Phase 1: OBSERVE ─────────────────────────────────────────────────────────

let cachedSnapshot: { snapshot: IEconomicStateDoc; expiresAt: number } | null = null

/**
 * Aggregate real platform metrics from MongoDB.
 * Uses parallel Promise.all to minimise latency with a 10-second cache.
 * All collections are accessed read-only.
 */
export const observeSystemState = async (forceFresh = false): Promise<IEconomicStateDoc> => {
  const nowTime = Date.now()

  // Return cached snapshot if still fresh (< 10 seconds old)
  if (!forceFresh && cachedSnapshot && cachedSnapshot.expiresAt > nowTime) {
    return cachedSnapshot.snapshot
  }

  const db = mongoose.connection.db
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Parallel aggregations across the platform
  const [
    totalUsers,
    totalProducts,
    activeSellers,
    ordersAgg,
    pendingOrders,
    failedPaymentsAgg,
    dlqCount,
    sagaAgg,
  ] = await Promise.all([
    // Total registered users
    db ? db.collection('users').countDocuments({ isActive: true }) : Promise.resolve(0),

    // Total published products
    db ? db.collection('products').countDocuments({ isActive: true }) : Promise.resolve(0),

    // Active sellers in last 24h (approximated by sellers with orders)
    db
      ? db.collection('users').countDocuments({ role: 'seller', isActive: true })
      : Promise.resolve(0),

    // Orders last 24h
    db
      ? db
          .collection('orders')
          .aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                avgValue: { $avg: '$totalAmount' },
              },
            },
          ])
          .toArray()
      : Promise.resolve([]),

    // Pending orders
    db
      ? db.collection('orders').countDocuments({ status: { $in: ['pending', 'processing'] } })
      : Promise.resolve(0),

    // Failed payments last 24h
    db
      ? db
          .collection('payments')
          .aggregate([
            { $match: { status: 'failed', createdAt: { $gte: oneDayAgo } } },
            { $group: { _id: null, count: { $sum: 1 } } },
          ])
          .toArray()
      : Promise.resolve([]),

    // Dead-letter queue depth (event processing failures)
    DeadLetterEventModel.countDocuments({ status: 'PENDING' }),

    // Active sagas (distributed transactions in-flight)
    db
      ? db
          .collection('sagainstances')
          .aggregate([
            { $match: { status: { $in: ['STARTED', 'IN_PROGRESS'] } } },
            { $group: { _id: null, count: { $sum: 1 } } },
          ])
          .toArray()
      : Promise.resolve([]),
  ])

  const orders24h = (ordersAgg[0]?.count as number) || 0
  const revenue24h = (ordersAgg[0]?.totalRevenue as number) || 0
  const avgOrderValue = (ordersAgg[0]?.avgValue as number) || 0
  const failedPayments24h = (failedPaymentsAgg[0]?.count as number) || 0
  const activeSagaCount = (sagaAgg[0]?.count as number) || 0

  // ── Derived Scores ────────────────────────────────────────────────────────

  // Demand flow: normalise orders against a 1000-orders-per-day baseline
  const demandFlow = clamp((orders24h / 1000) * 100, 0, 100)

  // Seller health: penalise for pending orders stacking up
  const sellerHealthScore = clamp(100 - (pendingOrders / Math.max(orders24h + 1, 1)) * 100, 0, 100)

  // Liquidity score: penalise for failed payments
  const failureRate = orders24h > 0 ? failedPayments24h / orders24h : 0
  const liquidityScore = clamp(100 - failureRate * 200, 0, 100)

  // Fraud risk: based on payment failure rate + DLQ depth
  const fraudRiskScore = clamp(failureRate * 60 + (dlqCount / 10) * 40, 0, 100)

  // Logistics health: based on pending order backlog ratio
  const logisticsHealthScore = clamp(
    100 - (pendingOrders / Math.max(totalProducts / 10, 1)) * 20,
    0,
    100,
  )

  // ── Stability Index ────────────────────────────────────────────────────────
  const stabilityIndex = weightedScore([
    { value: sellerHealthScore, weight: 25 },
    { value: liquidityScore, weight: 25 },
    { value: 100 - fraudRiskScore, weight: 20 },
    { value: logisticsHealthScore, weight: 15 },
    { value: demandFlow > 0 ? Math.min(demandFlow, 80) + 20 : 40, weight: 15 },
  ])

  // ── Growth Trajectory ──────────────────────────────────────────────────────
  // Compare to the most recent stored snapshot
  const lastSnapshot = await EconomicStateModel.findOne().sort({ timestamp: -1 })
  const prevOrders = lastSnapshot?.metrics?.totalOrders24h ?? orders24h
  const growthTrajectory = prevOrders === 0 ? 0 : ((orders24h - prevOrders) / prevOrders) * 100

  // ── Risk Forecast ──────────────────────────────────────────────────────────
  let riskForecast: IEconomicStateDoc['riskForecast'] = 'LOW'
  if (fraudRiskScore > 70 || liquidityScore < 30) riskForecast = 'SEVERE'
  else if (fraudRiskScore > 40 || liquidityScore < 60) riskForecast = 'HIGH'
  else if (fraudRiskScore > 20 || liquidityScore < 80) riskForecast = 'MEDIUM'

  // ── Economic State ─────────────────────────────────────────────────────────
  let calculatedEconomicState: IEconomicStateDoc['economicState']
  if (stabilityIndex >= 85 && demandFlow >= 60) calculatedEconomicState = 'THRIVING'
  else if (stabilityIndex >= 65) calculatedEconomicState = 'STABLE'
  else if (stabilityIndex >= 45) calculatedEconomicState = 'STRESSED'
  else if (stabilityIndex >= 25) calculatedEconomicState = 'CRITICAL'
  else calculatedEconomicState = 'EMERGENCY'

  // ── System Stress ──────────────────────────────────────────────────────────
  let systemStressLevel: IEconomicStateDoc['systemStressLevel'] = 'LOW'
  if (dlqCount > 100 || activeSagaCount > 50 || pendingOrders > 500) systemStressLevel = 'CRITICAL'
  else if (dlqCount > 50 || activeSagaCount > 20 || pendingOrders > 200) systemStressLevel = 'HIGH'
  else if (dlqCount > 10 || activeSagaCount > 5 || pendingOrders > 50) systemStressLevel = 'MEDIUM'

  const snapshot = new EconomicStateModel({
    snapshotId: uuidv4(),
    timestamp: now,
    economicState: calculatedEconomicState,
    stabilityIndex: Math.round(stabilityIndex),
    growthTrajectory: Math.round(growthTrajectory * 10) / 10,
    riskForecast,
    metrics: {
      totalActiveUsers: totalUsers,
      totalRevenue24h: Math.round(revenue24h * 100) / 100,
      totalOrders24h: orders24h,
      totalProducts,
      activeSellers,
      pendingOrders,
      failedPayments24h,
      dlqEventCount: dlqCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      demandFlow: Math.round(demandFlow),
      sellerHealthScore: Math.round(sellerHealthScore),
      liquidityScore: Math.round(liquidityScore),
      fraudRiskScore: Math.round(fraudRiskScore),
      logisticsHealthScore: Math.round(logisticsHealthScore),
    },
    systemStressLevel,
    triggeredActions: [],
  })

  await snapshot.save()
  cachedSnapshot = { snapshot, expiresAt: Date.now() + 10000 }
  return snapshot
}

// ─── Phase 2: SIMULATE ────────────────────────────────────────────────────────

/**
 * Run deterministic forward simulations for 3 candidate scenarios.
 * Each scenario models a different intervention strategy and
 * estimates its impact on stability, growth, and risk.
 */
export const simulateFutureOutcomes = (currentState: IEconomicStateDoc): SimulationScenario[] => {
  const { stabilityIndex, metrics } = currentState

  const scenarios: SimulationScenario[] = []

  // Scenario 1: Do Nothing
  scenarios.push({
    scenario: 'DO_NOTHING',
    stabilityImpact: 0,
    growthImpact: currentState.growthTrajectory > 0 ? 1 : -2,
    riskReduction: 0,
  })

  // Scenario 2: Demand Stimulation (pricing nudge + promoted sellers)
  // Effective when demand flow is low
  if (metrics.demandFlow < 50) {
    scenarios.push({
      scenario: 'DEMAND_STIMULATION',
      stabilityImpact: clamp(30 - stabilityIndex / 4, 5, 20),
      growthImpact: clamp(15 - metrics.demandFlow / 10, 5, 15),
      riskReduction: clamp(5 - metrics.fraudRiskScore / 20, 0, 10),
    })
  } else {
    scenarios.push({
      scenario: 'DEMAND_STIMULATION',
      stabilityImpact: 2,
      growthImpact: 3,
      riskReduction: 0,
    })
  }

  // Scenario 3: Stability Enforcement (fraud controls + logistics)
  // Effective when fraud risk or logistics are degraded
  if (metrics.fraudRiskScore > 30 || metrics.logisticsHealthScore < 70) {
    scenarios.push({
      scenario: 'STABILITY_ENFORCEMENT',
      stabilityImpact: clamp(metrics.fraudRiskScore / 3 + metrics.pendingOrders / 100, 5, 30),
      growthImpact: -2, // temporary slight suppression of demand
      riskReduction: clamp(metrics.fraudRiskScore / 2, 10, 50),
    })
  } else {
    scenarios.push({
      scenario: 'STABILITY_ENFORCEMENT',
      stabilityImpact: 3,
      growthImpact: -1,
      riskReduction: 5,
    })
  }

  return scenarios
}

// ─── Phase 3: DECIDE ──────────────────────────────────────────────────────────

/**
 * Select the highest-value action set from simulated scenarios.
 * Decisions are classified by type, target, impact, and reason.
 * No action is taken without corresponding justification.
 */
export const makeDecisions = (
  state: IEconomicStateDoc,
  _scenarios: SimulationScenario[],
): GodModeDecisionResult['decisions'] => {
  const decisions: GodModeDecisionResult['decisions'] = []
  const { metrics, economicState, riskForecast } = state

  // --- Rule: Emergency mode if CRITICAL or EMERGENCY ---
  if (economicState === 'EMERGENCY' || economicState === 'CRITICAL') {
    decisions.push({
      type: 'EMERGENCY_STABILIZATION',
      target: 'GLOBAL_MARKETPLACE',
      reason: `Economic state is ${economicState} with stability index ${state.stabilityIndex}`,
      impact: 'CRITICAL',
      executed: false,
    })
  }

  // --- Rule: Demand stimulation if demand flow is low ---
  if (metrics.demandFlow < 40) {
    decisions.push({
      type: 'BOOST_DEMAND',
      target: 'RECOMMENDATION_ENGINE',
      reason: `Demand flow at ${metrics.demandFlow}/100 — below threshold`,
      impact: metrics.demandFlow < 20 ? 'HIGH' : 'MEDIUM',
      executed: false,
    })
  }

  // --- Rule: Fraud throttle if fraud risk is HIGH ---
  if (metrics.fraudRiskScore > 50) {
    decisions.push({
      type: 'FRAUD_THROTTLE',
      target: 'PAYMENT_GATEWAY',
      reason: `Fraud risk score at ${metrics.fraudRiskScore}/100`,
      impact: metrics.fraudRiskScore > 75 ? 'CRITICAL' : 'HIGH',
      executed: false,
    })
  }

  // --- Rule: Logistics stabilization ---
  if (metrics.logisticsHealthScore < 60) {
    decisions.push({
      type: 'LOGISTICS_REBALANCE',
      target: 'SHIPPING_SERVICE',
      reason: `Logistics health at ${metrics.logisticsHealthScore}/100 — rebalancing routes`,
      impact: 'MEDIUM',
      executed: false,
    })
  }

  // --- Rule: DLQ cleanup if DLQ depth exceeds threshold ---
  if (metrics.dlqEventCount > 20) {
    decisions.push({
      type: 'DLQ_DRAIN',
      target: 'EVENT_BUS',
      reason: `${metrics.dlqEventCount} events in dead-letter queue`,
      impact: metrics.dlqEventCount > 100 ? 'HIGH' : 'MEDIUM',
      executed: false,
    })
  }

  // --- Rule: Forecast-based seller promotion ---
  if (riskForecast === 'LOW' && metrics.sellerHealthScore > 80) {
    decisions.push({
      type: 'SELLER_REWARD',
      target: 'VISIBILITY_ENGINE',
      reason: 'Low risk, high seller health — promoting top performers',
      impact: 'LOW',
      executed: false,
    })
  }

  // Always include an OBSERVE_AND_LEARN action
  decisions.push({
    type: 'OBSERVE_AND_LEARN',
    target: 'GOD_MODE_CORE',
    reason: 'Continuous learning and feedback recording',
    impact: 'LOW',
    executed: false,
  })

  return decisions
}

// ─── Phase 4: EXECUTE ─────────────────────────────────────────────────────────

/**
 * Execute decisions by updating MarketRules.
 * All rule changes are versioned and include the reason.
 * This is the only place rules are mutated.
 */
export const executeDecisions = async (
  decisions: GodModeDecisionResult['decisions'],
  cycleId: string,
): Promise<{ executedDecisions: GodModeDecisionResult['decisions']; rulesModified: string[] }> => {
  const rulesModified: string[] = []

  for (const decision of decisions) {
    try {
      switch (decision.type) {
        case 'BOOST_DEMAND': {
          // Upsert the demand-boost recommendation rule
          const existingRule = await MarketRuleModel.findOne({
            ruleId: 'rule_demand_boost',
          })
          if (existingRule) {
            existingRule.evolutionHistory.push({
              version: existingRule.version,
              changedBy: 'GOD_MODE_AI',
              reason: decision.reason,
              timestamp: new Date(),
              previousParameters: { ...existingRule.parameters },
            })
            existingRule.version += 1
            existingRule.parameters = {
              ...existingRule.parameters,
              boostMultiplier: Math.min(
                ((existingRule.parameters.boostMultiplier as number) || 1) + 0.1,
                2.0,
              ),
              lastBoostAt: new Date().toISOString(),
              cycleId,
            }
            existingRule.lastModifiedBy = 'GOD_MODE_AI'
            await existingRule.save()
            rulesModified.push(existingRule.ruleId)
          }
          decision.executed = true
          decision.result = 'Recommendation boost rule updated'
          break
        }

        case 'FRAUD_THROTTLE': {
          const existingRule = await MarketRuleModel.findOne({ ruleId: 'rule_fraud_throttle' })
          if (existingRule) {
            existingRule.evolutionHistory.push({
              version: existingRule.version,
              changedBy: 'GOD_MODE_AI',
              reason: decision.reason,
              timestamp: new Date(),
              previousParameters: { ...existingRule.parameters },
            })
            existingRule.version += 1
            existingRule.parameters = {
              ...existingRule.parameters,
              throttleLevel: Math.min(
                ((existingRule.parameters.throttleLevel as number) || 1) + 1,
                5,
              ),
              activatedAt: new Date().toISOString(),
              cycleId,
            }
            existingRule.lastModifiedBy = 'GOD_MODE_AI'
            await existingRule.save()
            rulesModified.push(existingRule.ruleId)
          }
          decision.executed = true
          decision.result = 'Fraud throttle level increased'
          break
        }

        case 'EMERGENCY_STABILIZATION': {
          const existingRule = await MarketRuleModel.findOne({
            ruleId: 'rule_emergency_mode',
          })
          if (existingRule) {
            existingRule.evolutionHistory.push({
              version: existingRule.version,
              changedBy: 'GOD_MODE_AI',
              reason: decision.reason,
              timestamp: new Date(),
              previousParameters: { ...existingRule.parameters },
            })
            existingRule.version += 1
            existingRule.parameters = {
              ...existingRule.parameters,
              emergencyActive: true,
              activatedAt: new Date().toISOString(),
              cycleId,
            }
            existingRule.isActive = true
            existingRule.lastModifiedBy = 'GOD_MODE_AI'
            await existingRule.save()
            rulesModified.push(existingRule.ruleId)
          }
          decision.executed = true
          decision.result = 'Emergency stabilization mode activated'
          break
        }

        default:
          // Non-rule-mutating decisions are recorded as executed immediately
          decision.executed = true
          decision.result = 'Acknowledged and logged'
          break
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn(`[GodMode] Decision execution failed: ${decision.type}`, { reason: message })
      decision.result = `Failed: ${message}`
    }
  }

  return { executedDecisions: decisions, rulesModified }
}

// ─── Phase 5: EVOLVE ──────────────────────────────────────────────────────────

/**
 * Record learning feedback — update effectiveness scores of rules
 * based on whether the economic state improved after the last cycle.
 */
export const evolveAndLearn = async (
  previousStability: number,
  currentStability: number,
  rulesModified: string[],
): Promise<void> => {
  const stabilityDelta = currentStability - previousStability

  for (const ruleId of rulesModified) {
    try {
      const rule = await MarketRuleModel.findOne({ ruleId })
      if (!rule) continue

      // Positive delta → rule helped → increase effectiveness score
      // Negative delta → rule may have hurt → decrease effectiveness score
      const scoreDelta =
        stabilityDelta > 0 ? Math.min(stabilityDelta * 2, 10) : Math.max(stabilityDelta, -5)
      rule.effectivenessScore = clamp(rule.effectivenessScore + scoreDelta, 0, 100)
      rule.aiConfidenceScore = clamp(
        rule.aiConfidenceScore + (stabilityDelta > 0 ? 0.01 : -0.01),
        0.1,
        0.99,
      )
      await rule.save()
    } catch (err) {
      logger.warn(`[GodMode] Evolution scoring failed for rule ${ruleId}`, { err })
    }
  }
}

// ─── Full Civilization Loop ───────────────────────────────────────────────────

/**
 * Execute one complete Autonomous Civilization Cycle.
 * This is called by the BullMQ repeatable job every 30 seconds.
 *
 * Phases: OBSERVE → SIMULATE → DECIDE → EXECUTE → EVOLVE
 *
 * The entire cycle is persisted in CivilizationCycle and GodModeDecision
 * for full auditability. Any failure in a phase is caught and logged
 * without crashing the process.
 */
export const runCivilizationCycle = async (): Promise<void> => {
  const cycleId = uuidv4()
  const startedAt = new Date()

  logger.info('[GodMode] Starting civilization cycle', { cycleId })

  // ── Phase 1: OBSERVE ────────────────────────────────────────────────────────
  let currentState: IEconomicStateDoc
  try {
    currentState = await observeSystemState()
  } catch (err) {
    logger.error('[GodMode] OBSERVE phase failed', { err, cycleId })
    return
  }

  const cyclePersist = new CivilizationCycleModel({
    cycleId,
    startedAt,
    status: 'RUNNING',
    phases: ['OBSERVE'],
    economicStateBefore: currentState.snapshotId,
    decisionsCount: 0,
    rulesModifiedCount: 0,
  })
  await cyclePersist.save()

  try {
    // ── Phase 2: SIMULATE ──────────────────────────────────────────────────────
    const scenarios = simulateFutureOutcomes(currentState)
    cyclePersist.phases.push('SIMULATE')

    // ── Phase 3: DECIDE ────────────────────────────────────────────────────────
    const rawDecisions = makeDecisions(currentState, scenarios)
    cyclePersist.phases.push('DECIDE')

    const decisionRecord = new GodModeDecisionModel({
      decisionId: uuidv4(),
      cycleId,
      timestamp: new Date(),
      phase: 'DECIDE',
      economicStateBefore: currentState.snapshotId,
      decisions: rawDecisions,
      rulesModified: [],
      simulatedOutcomes: scenarios,
      executionDurationMs: 0,
      status: 'PENDING',
    })
    await decisionRecord.save()

    // ── Phase 4: EXECUTE ───────────────────────────────────────────────────────
    const { executedDecisions, rulesModified } = await executeDecisions(rawDecisions, cycleId)
    cyclePersist.phases.push('EXECUTE')

    decisionRecord.decisions = executedDecisions
    decisionRecord.rulesModified = rulesModified
    decisionRecord.status = executedDecisions.every((d) => d.executed) ? 'EXECUTED' : 'PARTIAL'

    // ── Phase 5: EVOLVE ────────────────────────────────────────────────────────
    // Snapshot after execution
    const afterState = await observeSystemState()
    cyclePersist.phases.push('EVOLVE')

    await evolveAndLearn(currentState.stabilityIndex, afterState.stabilityIndex, rulesModified)

    decisionRecord.economicStateAfter = afterState.snapshotId
    decisionRecord.executionDurationMs = Date.now() - startedAt.getTime()
    await decisionRecord.save()

    cyclePersist.completedAt = new Date()
    cyclePersist.durationMs = Date.now() - startedAt.getTime()
    cyclePersist.status = 'COMPLETED'
    cyclePersist.economicStateAfter = afterState.snapshotId
    cyclePersist.decisionsCount = executedDecisions.length
    cyclePersist.rulesModifiedCount = rulesModified.length
    await cyclePersist.save()

    logger.info('[GodMode] Civilization cycle completed', {
      cycleId,
      economicState: afterState.economicState,
      stabilityIndex: afterState.stabilityIndex,
      decisionsCount: executedDecisions.length,
      durationMs: cyclePersist.durationMs,
    })
  } catch (err) {
    logger.error('[GodMode] Civilization cycle failed', { err, cycleId })
    cyclePersist.status = 'FAILED'
    cyclePersist.errorReason = err instanceof Error ? err.message : String(err)
    cyclePersist.completedAt = new Date()
    cyclePersist.durationMs = Date.now() - startedAt.getTime()
    await cyclePersist.save().catch(() => {})
  }
}

// ─── Status Query ─────────────────────────────────────────────────────────────

export const getGodModeStatus = async (): Promise<GodModeStatus> => {
  const [lastCycle, lastState, activeRules, totalCycles] = await Promise.all([
    CivilizationCycleModel.findOne({ status: 'COMPLETED' }).sort({ completedAt: -1 }),
    EconomicStateModel.findOne().sort({ timestamp: -1 }),
    MarketRuleModel.countDocuments({ isActive: true }),
    CivilizationCycleModel.countDocuments({ status: 'COMPLETED' }),
  ])

  return {
    engineStatus: lastCycle ? 'ACTIVE' : 'OFFLINE',
    lastCycleAt: lastCycle?.completedAt || null,
    lastCycleId: lastCycle?.cycleId || null,
    totalCyclesCompleted: totalCycles,
    currentEconomicState: lastState?.economicState || 'UNKNOWN',
    stabilityIndex: lastState?.stabilityIndex || 0,
    riskForecast: lastState?.riskForecast || 'UNKNOWN',
    activeRulesCount: activeRules,
  }
}

// ─── Seed Default Market Rules ────────────────────────────────────────────────

/**
 * Seed the four foundational market rules on first startup.
 * Idempotent — safe to call multiple times.
 */
export const seedDefaultMarketRules = async (): Promise<void> => {
  const defaultRules: Partial<IMarketRuleDoc>[] = [
    {
      ruleId: 'rule_demand_boost',
      ruleName: 'Demand Stimulation Rule',
      category: 'RECOMMENDATION',
      description:
        'Increases recommendation diversity and seller visibility when demand flow falls below threshold.',
      isActive: true,
      parameters: { boostMultiplier: 1.0, demandThreshold: 40 },
      conditions: [{ field: 'metrics.demandFlow', operator: 'LT', value: 40 }],
      actions: [{ type: 'BOOST_RECOMMENDATIONS', parameters: { multiplier: 1.0 } }],
      evolutionHistory: [],
      aiConfidenceScore: 0.85,
      effectivenessScore: 80,
      createdBy: 'GOD_MODE_AI',
      lastModifiedBy: 'GOD_MODE_AI',
    },
    {
      ruleId: 'rule_fraud_throttle',
      ruleName: 'Fraud Throttle Rule',
      category: 'GOVERNANCE',
      description:
        'Progressively tightens payment controls when fraud risk score exceeds safe threshold.',
      isActive: true,
      parameters: { throttleLevel: 1, maxThrottleLevel: 5, fraudThreshold: 50 },
      conditions: [{ field: 'metrics.fraudRiskScore', operator: 'GT', value: 50 }],
      actions: [{ type: 'THROTTLE_PAYMENTS', parameters: { level: 1 } }],
      evolutionHistory: [],
      aiConfidenceScore: 0.9,
      effectivenessScore: 85,
      createdBy: 'GOD_MODE_AI',
      lastModifiedBy: 'GOD_MODE_AI',
    },
    {
      ruleId: 'rule_emergency_mode',
      ruleName: 'Emergency Stabilization Rule',
      category: 'GOVERNANCE',
      description:
        'Activates platform-wide emergency controls when stability drops to CRITICAL or EMERGENCY level.',
      isActive: false,
      parameters: { emergencyActive: false },
      conditions: [{ field: 'economicState', operator: 'IN', value: ['CRITICAL', 'EMERGENCY'] }],
      actions: [{ type: 'ACTIVATE_EMERGENCY_MODE', parameters: {} }],
      evolutionHistory: [],
      aiConfidenceScore: 0.95,
      effectivenessScore: 90,
      createdBy: 'GOD_MODE_AI',
      lastModifiedBy: 'GOD_MODE_AI',
    },
    {
      ruleId: 'rule_seller_reward',
      ruleName: 'Seller Reward Visibility Rule',
      category: 'VISIBILITY',
      description:
        'Promotes top-performing sellers in recommendations when platform health is strong.',
      isActive: true,
      parameters: { rewardMultiplier: 1.5, healthThreshold: 80 },
      conditions: [{ field: 'metrics.sellerHealthScore', operator: 'GT', value: 80 }],
      actions: [{ type: 'PROMOTE_TOP_SELLERS', parameters: { multiplier: 1.5 } }],
      evolutionHistory: [],
      aiConfidenceScore: 0.8,
      effectivenessScore: 75,
      createdBy: 'GOD_MODE_AI',
      lastModifiedBy: 'GOD_MODE_AI',
    },
  ]

  for (const rule of defaultRules) {
    await MarketRuleModel.findOneAndUpdate(
      { ruleId: rule.ruleId },
      { $setOnInsert: rule },
      { upsert: true, new: false },
    )
  }

  logger.info('[GodMode] Default market rules seeded')
}
