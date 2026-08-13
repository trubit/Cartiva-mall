import mongoose, { Schema, Document } from 'mongoose'

// ─── 1. Economic State Snapshot ──────────────────────────────────────────────
export interface IEconomicStateDoc extends Document {
  snapshotId: string
  timestamp: Date
  economicState: 'THRIVING' | 'STABLE' | 'STRESSED' | 'CRITICAL' | 'EMERGENCY'
  stabilityIndex: number // 0–100
  growthTrajectory: number // % change vs prior snapshot
  riskForecast: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE'
  metrics: {
    totalActiveUsers: number
    totalRevenue24h: number
    totalOrders24h: number
    totalProducts: number
    activeSellers: number
    pendingOrders: number
    failedPayments24h: number
    dlqEventCount: number
    avgOrderValue: number
    demandFlow: number // derived demand score 0–100
    sellerHealthScore: number // 0–100
    liquidityScore: number // 0–100
    fraudRiskScore: number // 0–100
    logisticsHealthScore: number // 0–100
  }
  systemStressLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  triggeredActions: string[]
}

const economicStateSchema = new Schema<IEconomicStateDoc>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    economicState: {
      type: String,
      enum: ['THRIVING', 'STABLE', 'STRESSED', 'CRITICAL', 'EMERGENCY'],
      required: true,
      index: true,
    },
    stabilityIndex: { type: Number, required: true, min: 0, max: 100 },
    growthTrajectory: { type: Number, required: true, default: 0 },
    riskForecast: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'SEVERE'],
      required: true,
    },
    metrics: {
      totalActiveUsers: { type: Number, default: 0 },
      totalRevenue24h: { type: Number, default: 0 },
      totalOrders24h: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
      activeSellers: { type: Number, default: 0 },
      pendingOrders: { type: Number, default: 0 },
      failedPayments24h: { type: Number, default: 0 },
      dlqEventCount: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 },
      demandFlow: { type: Number, default: 50 },
      sellerHealthScore: { type: Number, default: 100 },
      liquidityScore: { type: Number, default: 100 },
      fraudRiskScore: { type: Number, default: 0 },
      logisticsHealthScore: { type: Number, default: 100 },
    },
    systemStressLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    triggeredActions: [{ type: String }],
  },
  { timestamps: true },
)

// Keep only the latest 1000 snapshots for history
economicStateSchema.index({ timestamp: -1 })

export const EconomicStateModel =
  mongoose.models.EconomicState ||
  mongoose.model<IEconomicStateDoc>('EconomicState', economicStateSchema)

// ─── 2. Market Rule (Self-Evolving Rule Engine) ──────────────────────────────
export interface IMarketRuleDoc extends Document {
  ruleId: string
  ruleName: string
  category: 'RANKING' | 'PRICING' | 'RECOMMENDATION' | 'PROMOTION' | 'VISIBILITY' | 'GOVERNANCE'
  description: string
  version: number
  isActive: boolean
  parameters: Record<string, unknown>
  conditions: {
    field: string
    operator: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ' | 'IN' | 'NOT_IN'
    value: unknown
  }[]
  actions: {
    type: string
    parameters: Record<string, unknown>
  }[]
  evolutionHistory: {
    version: number
    changedBy: string
    reason: string
    timestamp: Date
    previousParameters: Record<string, unknown>
  }[]
  aiConfidenceScore: number // 0–1 — how confident the AI is in this rule
  effectivenessScore: number // 0–100 — measured effectiveness
  createdBy: string
  lastModifiedBy: string
}

const marketRuleSchema = new Schema<IMarketRuleDoc>(
  {
    ruleId: { type: String, required: true, unique: true, index: true },
    ruleName: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['RANKING', 'PRICING', 'RECOMMENDATION', 'PROMOTION', 'VISIBILITY', 'GOVERNANCE'],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    version: { type: Number, default: 1, required: true },
    isActive: { type: Boolean, default: true, index: true },
    parameters: { type: Schema.Types.Mixed, default: {} },
    conditions: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: ['GT', 'LT', 'GTE', 'LTE', 'EQ', 'NEQ', 'IN', 'NOT_IN'],
          required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],
    actions: [
      {
        type: { type: String, required: true },
        parameters: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    evolutionHistory: [
      {
        version: { type: Number, required: true },
        changedBy: { type: String, required: true },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        previousParameters: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    aiConfidenceScore: { type: Number, default: 0.8, min: 0, max: 1 },
    effectivenessScore: { type: Number, default: 80, min: 0, max: 100 },
    createdBy: { type: String, required: true, default: 'GOD_MODE_AI' },
    lastModifiedBy: { type: String, required: true, default: 'GOD_MODE_AI' },
  },
  { timestamps: true },
)

export const MarketRuleModel =
  mongoose.models.MarketRule || mongoose.model<IMarketRuleDoc>('MarketRule', marketRuleSchema)

// ─── 3. God-Mode Decision (Audit Trail) ──────────────────────────────────────
export interface IGodModeDecisionDoc extends Document {
  decisionId: string
  cycleId: string
  timestamp: Date
  phase: 'OBSERVE' | 'SIMULATE' | 'DECIDE' | 'EXECUTE' | 'EVOLVE'
  economicStateBefore: string // snapshotId ref
  economicStateAfter?: string // snapshotId ref
  decisions: {
    type: string
    target: string
    reason: string
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    executed: boolean
    result?: string
  }[]
  rulesModified: string[] // ruleIds
  simulatedOutcomes: {
    scenario: string
    stabilityImpact: number
    growthImpact: number
    riskReduction: number
  }[]
  executionDurationMs: number
  status: 'PENDING' | 'EXECUTED' | 'PARTIAL' | 'FAILED' | 'ROLLED_BACK'
  errorReason?: string
}

const godModeDecisionSchema = new Schema<IGodModeDecisionDoc>(
  {
    decisionId: { type: String, required: true, unique: true, index: true },
    cycleId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    phase: {
      type: String,
      enum: ['OBSERVE', 'SIMULATE', 'DECIDE', 'EXECUTE', 'EVOLVE'],
      required: true,
    },
    economicStateBefore: { type: String, required: true },
    economicStateAfter: { type: String },
    decisions: [
      {
        type: { type: String, required: true },
        target: { type: String, required: true },
        reason: { type: String, required: true },
        impact: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          required: true,
        },
        executed: { type: Boolean, default: false },
        result: { type: String },
      },
    ],
    rulesModified: [{ type: String }],
    simulatedOutcomes: [
      {
        scenario: { type: String, required: true },
        stabilityImpact: { type: Number, required: true },
        growthImpact: { type: Number, required: true },
        riskReduction: { type: Number, required: true },
      },
    ],
    executionDurationMs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'EXECUTED', 'PARTIAL', 'FAILED', 'ROLLED_BACK'],
      default: 'PENDING',
      index: true,
    },
    errorReason: { type: String },
  },
  { timestamps: true },
)

godModeDecisionSchema.index({ timestamp: -1 })
godModeDecisionSchema.index({ cycleId: 1, phase: 1 })

export const GodModeDecisionModel =
  mongoose.models.GodModeDecision ||
  mongoose.model<IGodModeDecisionDoc>('GodModeDecision', godModeDecisionSchema)

// ─── 4. Civilization Cycle (Loop Audit) ──────────────────────────────────────
export interface ICivilizationCycleDoc extends Document {
  cycleId: string
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  phases: ('OBSERVE' | 'SIMULATE' | 'DECIDE' | 'EXECUTE' | 'EVOLVE')[]
  economicStateBefore: string
  economicStateAfter?: string
  decisionsCount: number
  rulesModifiedCount: number
  errorReason?: string
}

const civilizationCycleSchema = new Schema<ICivilizationCycleDoc>(
  {
    cycleId: { type: String, required: true, unique: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now, index: true },
    completedAt: { type: Date },
    durationMs: { type: Number },
    status: {
      type: String,
      enum: ['RUNNING', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
      index: true,
    },
    phases: [{ type: String }],
    economicStateBefore: { type: String, required: true },
    economicStateAfter: { type: String },
    decisionsCount: { type: Number, default: 0 },
    rulesModifiedCount: { type: Number, default: 0 },
    errorReason: { type: String },
  },
  { timestamps: true },
)

civilizationCycleSchema.index({ startedAt: -1 })

export const CivilizationCycleModel =
  mongoose.models.CivilizationCycle ||
  mongoose.model<ICivilizationCycleDoc>('CivilizationCycle', civilizationCycleSchema)
