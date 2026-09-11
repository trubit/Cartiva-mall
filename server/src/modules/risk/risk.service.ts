import mongoose from 'mongoose'
import { redis } from '../../database/redis.js'
import {
  RiskCase,
  type RiskLevel,
  type CaseStatus,
  type CaseResolution,
  type SubjectType,
} from './riskCase.model.js'
import { RiskAudit } from './riskAudit.model.js'
export type { SubjectType }
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'

export type RiskDecision = 'ALLOW' | 'REVIEW' | 'STEP_UP' | 'RESTRICT' | 'BLOCK'

export interface RiskSignals {
  failedPaymentAttempts?: number
  ordersInLastHour?: number
  reviewsInLastHour?: number
  refundRequestsCount?: number
  promotionUsageCount?: number
  accountAgeDays?: number
  ipAddress?: string
  deviceId?: string
}

export interface RiskAssessmentResult {
  subjectType: SubjectType
  subjectId: string
  riskScore: number
  riskLevel: RiskLevel
  decision: RiskDecision
  reasonCodes: string[]
  caseId?: string
}

// ─── Redis Velocity Engine ───────────────────────────────────────────────────

export const recordVelocitySignal = async (
  prefix: string,
  identifier: string,
  windowSeconds = 3600,
): Promise<number> => {
  try {
    const key = `risk:velocity:${prefix}:${identifier}`
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    return count
  } catch (err) {
    console.warn('[RiskService] Redis velocity record failed:', err)
    return 1
  }
}

export const getVelocitySignal = async (prefix: string, identifier: string): Promise<number> => {
  try {
    const key = `risk:velocity:${prefix}:${identifier}`
    const val = await redis.get(key)
    return val ? parseInt(val, 10) : 0
  } catch (err) {
    console.warn('[RiskService] Redis velocity get failed:', err)
    return 0
  }
}

// ─── Risk Assessment Pipeline ────────────────────────────────────────────────

export const evaluateRisk = async (
  subjectType: SubjectType,
  subjectId: string,
  signals: RiskSignals = {},
): Promise<RiskAssessmentResult> => {
  try {
    let calculatedScore = 0
    const reasonCodes: string[] = []

    // 1. Payment failure signals
    const failedPayments =
      signals.failedPaymentAttempts ?? (await getVelocitySignal('payment_fail', subjectId))
    if (failedPayments >= 5) {
      calculatedScore += 40
      reasonCodes.push('RAPID_PAYMENT_FAILURES')
    } else if (failedPayments >= 3) {
      calculatedScore += 20
      reasonCodes.push('MULTIPLE_PAYMENT_FAILURES')
    }

    // 2. Order velocity signals
    const orderCount =
      signals.ordersInLastHour ?? (await getVelocitySignal('order_create', subjectId))
    if (orderCount >= 10) {
      calculatedScore += 35
      reasonCodes.push('HIGH_ORDER_VELOCITY')
    } else if (orderCount >= 5) {
      calculatedScore += 15
      reasonCodes.push('MODERATE_ORDER_VELOCITY')
    }

    // 3. Review submission velocity signals
    const reviewCount =
      signals.reviewsInLastHour ?? (await getVelocitySignal('review_submit', subjectId))
    if (reviewCount >= 8) {
      calculatedScore += 30
      reasonCodes.push('SUSPICIOUS_REVIEW_VELOCITY')
    }

    // 4. Refund request anomalies
    if ((signals.refundRequestsCount ?? 0) >= 3) {
      calculatedScore += 25
      reasonCodes.push('UNUSUAL_REFUND_PATTERN')
    }

    // 5. Promotion abuse signals
    if ((signals.promotionUsageCount ?? 0) >= 5) {
      calculatedScore += 20
      reasonCodes.push('PROMOTION_ABUSE_SIGNAL')
    }

    // 6. Account age check
    if (
      signals.accountAgeDays !== undefined &&
      signals.accountAgeDays < 1 &&
      calculatedScore > 10
    ) {
      calculatedScore += 15
      reasonCodes.push('NEW_ACCOUNT_HIGH_ACTIVITY')
    }

    const finalScore = Math.min(100, Math.max(0, calculatedScore))

    let riskLevel: RiskLevel = 'LOW'
    let decision: RiskDecision = 'ALLOW'

    if (finalScore >= 86) {
      riskLevel = 'CRITICAL'
      decision = 'RESTRICT'
    } else if (finalScore >= 61) {
      riskLevel = 'HIGH'
      decision = 'STEP_UP'
    } else if (finalScore >= 31) {
      riskLevel = 'MEDIUM'
      decision = 'REVIEW'
    } else {
      riskLevel = 'LOW'
      decision = 'ALLOW'
    }

    let caseId: string | undefined

    // Automatic case creation for HIGH / CRITICAL risk
    if (finalScore >= 61) {
      caseId = `case_${uuidv4().replace(/-/g, '').substring(0, 12)}`
      await RiskCase.create({
        caseId,
        subjectType,
        subjectId,
        riskLevel,
        riskScore: finalScore,
        status: 'OPEN',
        reasonCodes,
      })
    }

    // Log audit record asynchronously
    void RiskAudit.create({
      auditId: `aud_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      action: 'EVALUATION',
      subjectType,
      subjectId,
      riskScore: finalScore,
      decision,
      reason: reasonCodes.join(', '),
      metadata: { signals, caseId },
    })

    return {
      subjectType,
      subjectId,
      riskScore: finalScore,
      riskLevel,
      decision,
      reasonCodes,
      caseId,
    }
  } catch (err) {
    logger.error('[RiskService] Error in evaluateRisk fallback:', { err })
    // Controlled fail-open fallback so Risk Service outage doesn't block legitimate users
    return {
      subjectType,
      subjectId,
      riskScore: 0,
      riskLevel: 'LOW',
      decision: 'ALLOW',
      reasonCodes: ['FAIL_OPEN_FALLBACK'],
    }
  }
}

// ─── Case Management ─────────────────────────────────────────────────────────

export const listRiskCases = async (status?: string, riskLevel?: string, page = 1, limit = 20) => {
  const filter: Record<string, unknown> = {}
  if (status) filter['status'] = status
  if (riskLevel) filter['riskLevel'] = riskLevel

  const skip = (page - 1) * limit
  const [cases, total] = await Promise.all([
    RiskCase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'firstName lastName email')
      .lean(),
    RiskCase.countDocuments(filter),
  ])

  return {
    cases,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

export const getRiskCaseById = async (caseId: string) => {
  const riskCase = await RiskCase.findOne({ caseId })
    .populate('assignedTo', 'firstName lastName email')
    .lean()
  if (!riskCase) throw new AppError('Risk case not found', 404)
  return riskCase
}

export const updateRiskCase = async (
  caseId: string,
  status: CaseStatus,
  resolution?: CaseResolution,
  moderatorNotes?: string,
  operatorId?: string,
) => {
  const riskCase = await RiskCase.findOne({ caseId })
  if (!riskCase) throw new AppError('Risk case not found', 404)

  riskCase.status = status
  if (resolution) {
    riskCase.resolution = resolution
    riskCase.resolvedAt = new Date()
  }
  if (moderatorNotes) riskCase.moderatorNotes = moderatorNotes
  if (operatorId && mongoose.isValidObjectId(operatorId)) {
    riskCase.assignedTo = new mongoose.Types.ObjectId(operatorId)
  }

  await riskCase.save()

  void RiskAudit.create({
    auditId: `aud_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    action: 'CASE_UPDATE',
    subjectType: riskCase.subjectType,
    subjectId: riskCase.subjectId,
    actorId:
      operatorId && mongoose.isValidObjectId(operatorId)
        ? new mongoose.Types.ObjectId(operatorId)
        : undefined,
    decision: status,
    reason: moderatorNotes,
    metadata: { resolution },
  })

  return riskCase
}

export const submitCustomerAppeal = async (caseId: string, userId: string, appealNotes: string) => {
  const riskCase = await RiskCase.findOne({ caseId, subjectId: userId })
  if (!riskCase) throw new AppError('Case not found or unauthorized', 404)

  riskCase.appealed = true
  riskCase.appealNotes = appealNotes
  riskCase.status = 'INVESTIGATING'
  await riskCase.save()

  void RiskAudit.create({
    auditId: `aud_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    action: 'APPEAL_SUBMITTED',
    subjectType: 'user',
    subjectId: userId,
    reason: appealNotes,
    metadata: { caseId },
  })

  return riskCase
}
