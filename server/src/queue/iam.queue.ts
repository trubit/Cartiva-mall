import { Queue, Worker, type Job } from 'bullmq'
import { redisConnection } from './connection.js'
import { ComplianceReport } from '../modules/iam/complianceReport.model.js'
import { Session } from '../modules/iam/session.model.js'
import { SecurityEvent } from '../modules/iam/securityEvent.model.js'
import { UserRoleAssignment } from '../modules/iam/userRoleAssignment.model.js'
import { Mfa } from '../modules/iam/mfa.model.js'
import { RiskEvent } from '../modules/iam/riskEvent.model.js'
import { logger } from '../utils/logger.js'

export const IAM_QUEUE_NAME = 'iam-compliance'

export interface ComplianceJobData {
  reportId: string
  type: string
  periodStart: string
  periodEnd: string
}

// Lazy-initialized — only created once BullMQ availability is confirmed.
let iamQueue: Queue<ComplianceJobData> | null = null
let iamWorker: Worker<ComplianceJobData> | null = null
let bullmqAvailable = true // flipped to false on first Redis version error

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

const generateReportData = async (
  type: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ data: Record<string, unknown>; summary: string }> => {
  const dateFilter = { createdAt: { $gte: periodStart, $lte: periodEnd } }

  switch (type) {
    case 'access_review': {
      const [totalAssignments, roleBreakdown] = await Promise.all([
        UserRoleAssignment.countDocuments(dateFilter),
        UserRoleAssignment.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$roleId', count: { $sum: 1 } } },
        ]),
      ])
      return {
        data: { totalAssignments, roleBreakdown },
        summary: `Access review: ${totalAssignments} role assignments in period`,
      }
    }

    case 'session_audit': {
      const [totalSessions, activeSessions, expiredSessions] = await Promise.all([
        Session.countDocuments(dateFilter),
        Session.countDocuments({ ...dateFilter, isActive: true }),
        Session.countDocuments({ ...dateFilter, isActive: false }),
      ])
      return {
        data: { totalSessions, activeSessions, expiredSessions },
        summary: `Session audit: ${totalSessions} sessions (${activeSessions} active, ${expiredSessions} expired)`,
      }
    }

    case 'security_events': {
      const [total, bySeverity] = await Promise.all([
        SecurityEvent.countDocuments(dateFilter),
        SecurityEvent.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
      ])
      return {
        data: { total, bySeverity },
        summary: `Security events: ${total} events logged in period`,
      }
    }

    case 'mfa_compliance': {
      const [mfaEnabled, mfaDisabled] = await Promise.all([
        Mfa.countDocuments({ isEnabled: true }),
        Mfa.countDocuments({ isEnabled: false }),
      ])
      const total = mfaEnabled + mfaDisabled
      const rate = total > 0 ? Math.round((mfaEnabled / total) * 100) : 0
      return {
        data: { mfaEnabled, mfaDisabled, total, complianceRate: rate },
        summary: `MFA compliance: ${rate}% of users have MFA enabled`,
      }
    }

    case 'data_retention': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const [oldSessions, oldEvents, resolvedRisks] = await Promise.all([
        Session.countDocuments({ createdAt: { $lt: thirtyDaysAgo }, isActive: false }),
        SecurityEvent.countDocuments({ createdAt: { $lt: thirtyDaysAgo } }),
        RiskEvent.countDocuments({ resolved: true, createdAt: { $lt: thirtyDaysAgo } }),
      ])
      return {
        data: {
          oldInactiveSessions: oldSessions,
          oldSecurityEvents: oldEvents,
          resolvedRiskEvents: resolvedRisks,
        },
        summary: `Data retention: ${oldSessions + oldEvents} records eligible for archival`,
      }
    }

    default: {
      return {
        data: { type, note: 'General permission audit' },
        summary: 'Permission audit completed',
      }
    }
  }
}

const processComplianceJob = async (job: Job<ComplianceJobData>): Promise<void> => {
  const { reportId, type, periodStart, periodEnd } = job.data

  await ComplianceReport.findByIdAndUpdate(reportId, { status: 'generating' })

  try {
    const { data, summary } = await generateReportData(
      type,
      new Date(periodStart),
      new Date(periodEnd),
    )

    await ComplianceReport.findByIdAndUpdate(reportId, {
      status: 'completed',
      data,
      summary,
    })

    logger.info(`Compliance report ${reportId} (${type}) generated successfully`)
  } catch (err) {
    await ComplianceReport.findByIdAndUpdate(reportId, { status: 'failed' })
    throw err
  }
}

export const startIamWorker = (): void => {
  if (iamWorker || !bullmqAvailable) return

  try {
    iamQueue = new Queue<ComplianceJobData>(IAM_QUEUE_NAME, {
      connection: redisConnection,
      skipVersionCheck: true,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })

    // Silence Queue-level connection errors so they don't crash the process.
    iamQueue.on('error', (err) => {
      if (isVersionError(err) && bullmqAvailable) {
        logger.warn('[IAM Queue] Redis < 5.0 — BullMQ disabled, compliance reports run inline')
        bullmqAvailable = false
        void stopIamWorker()
      }
    })

    iamWorker = new Worker<ComplianceJobData>(IAM_QUEUE_NAME, processComplianceJob, {
      connection: redisConnection,
      concurrency: 2,
      skipVersionCheck: true,
    })

    iamWorker.on('completed', (job) => {
      logger.info(`[IAM Worker] Job ${job.id} completed`)
    })

    iamWorker.on('failed', (job, err) => {
      logger.error(`[IAM Worker] Job ${job?.id} failed`, { error: err.message })
    })

    // Catch Redis version errors from the Worker without crashing.
    iamWorker.on('error', (err) => {
      if (isVersionError(err)) {
        if (bullmqAvailable) {
          logger.warn(
            '[IAM Worker] Redis < 5.0 detected — BullMQ disabled, compliance reports run inline',
          )
          bullmqAvailable = false
          void stopIamWorker()
        }
        return
      }
      logger.error('[IAM Worker] Unexpected error', { error: (err as Error).message })
    })

    logger.info('IAM BullMQ compliance worker started')
  } catch (err) {
    if (isVersionError(err)) {
      logger.warn('[IAM Worker] Redis < 5.0 — BullMQ disabled, compliance reports run inline')
      bullmqAvailable = false
    } else {
      logger.error('[IAM Worker] Failed to start', { error: (err as Error).message })
    }
  }
}

export const stopIamWorker = async (): Promise<void> => {
  if (iamWorker) {
    await iamWorker.close().catch(() => {})
    iamWorker = null
  }
  if (iamQueue) {
    await iamQueue.close().catch(() => {})
    iamQueue = null
  }
}

export const enqueueComplianceReport = async (
  reportId: string,
  type: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<string> => {
  if (!bullmqAvailable || !iamQueue) {
    throw new Error('BullMQ unavailable')
  }
  const job = await iamQueue.add('generate-report', {
    reportId,
    type,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  })
  return job.id ?? reportId
}
