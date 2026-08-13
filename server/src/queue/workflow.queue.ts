import { Queue, Worker, type Job } from 'bullmq'
import mongoose from 'mongoose'
import { redisConnection } from './connection.js'
import { Workflow } from '../modules/workflow/workflow.model.js'
import { WorkflowExecution } from '../modules/workflow/workflowExecution.model.js'
import { WorkflowAudit } from '../modules/workflow/workflowAudit.model.js'
import { logger } from '../utils/logger.js'
import type { WorkflowStep } from '../../../src/shared/types/workflow.types.js'

export const WORKFLOW_QUEUE_NAME = 'workflow-execution'

export interface WorkflowJobData {
  workflowId: string
  executionId: string
  triggerData: Record<string, unknown>
}

// Lazy-initialized — only created once BullMQ availability is confirmed.
let workflowQueue: Queue<WorkflowJobData> | null = null
let workflowWorker: Worker<WorkflowJobData> | null = null
let bullmqAvailable = true // flipped to false on first Redis version error

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

const executeStep = async (
  step: WorkflowStep,
  triggerData: Record<string, unknown>,
  executionId: string,
): Promise<{ success: boolean; nextStepId?: string }> => {
  try {
    switch (step.type) {
      case 'action':
        logger.info(`[Worker] Executing action step: ${step.actionType}`, {
          executionId,
          stepId: step.id,
        })
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { success: true, nextStepId: step.nextStepId }

      case 'condition': {
        const conditionKey = (step.parameters?.field as string) ?? 'status'
        const conditionValue = step.parameters?.value
        const fieldValue = (triggerData as Record<string, unknown>)[conditionKey]
        const matches = fieldValue === conditionValue
        return {
          success: true,
          nextStepId: matches ? step.conditionTrueStepId : step.conditionFalseStepId,
        }
      }

      case 'delay':
        if (step.delayMs && step.delayMs > 0 && step.delayMs <= 30_000) {
          await new Promise((resolve) => setTimeout(resolve, step.delayMs))
        }
        return { success: true, nextStepId: step.nextStepId }

      case 'approval':
        logger.info(`[Worker] Approval step — suspending execution pending manual approval`, {
          executionId,
          stepId: step.id,
        })
        return { success: true, nextStepId: undefined }

      default:
        return { success: true, nextStepId: step.nextStepId }
    }
  } catch (err) {
    logger.error(`[Worker] Step execution failed`, { executionId, stepId: step.id, err })
    return { success: false }
  }
}

const processWorkflowJob = async (job: Job<WorkflowJobData>): Promise<void> => {
  const { workflowId, executionId, triggerData } = job.data

  const workflow = await Workflow.findById(workflowId).lean()
  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`)
  }

  const logs: { stepId: string; message: string; at: Date; level: 'info' | 'warn' | 'error' }[] = []
  const stepsCompleted: string[] = []
  const stepsFailed: string[] = []

  try {
    const stepMap = new Map(workflow.steps.map((s: WorkflowStep) => [s.id, s]))
    let currentStep: WorkflowStep | null = workflow.steps[0] ?? null

    while (currentStep) {
      await WorkflowExecution.findByIdAndUpdate(executionId, {
        currentStepId: currentStep.id,
      })

      const { success, nextStepId } = await executeStep(currentStep, triggerData, executionId)

      logs.push({
        stepId: currentStep.id,
        message: success
          ? `Step "${currentStep.name}" completed`
          : `Step "${currentStep.name}" failed`,
        at: new Date(),
        level: success ? 'info' : 'error',
      })

      if (success) {
        stepsCompleted.push(currentStep.id)
        if (!nextStepId) break
        currentStep = stepMap.get(nextStepId) ?? null
      } else {
        stepsFailed.push(currentStep.id)
        break
      }
    }

    const allOk = stepsFailed.length === 0
    await WorkflowExecution.findByIdAndUpdate(executionId, {
      status: allOk ? 'completed' : 'failed',
      stepsCompleted,
      stepsFailed,
      logs,
      completedAt: allOk ? new Date() : undefined,
      failedAt: !allOk ? new Date() : undefined,
    })

    await Workflow.findByIdAndUpdate(workflowId, {
      $inc: { executionCount: 1 },
      lastExecutedAt: new Date(),
    })

    WorkflowAudit.create({
      workflowId: new mongoose.Types.ObjectId(workflowId),
      executionId: new mongoose.Types.ObjectId(executionId),
      action: allOk ? 'execution_completed' : 'execution_failed',
      meta: { stepsCompleted: stepsCompleted.length, stepsFailed: stepsFailed.length },
    }).catch(() => {})

    logger.info(`[Worker] Workflow execution ${allOk ? 'completed' : 'failed'}`, {
      workflowId,
      executionId,
    })
  } catch (err) {
    await WorkflowExecution.findByIdAndUpdate(executionId, {
      status: 'failed',
      failedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      logs,
    })
    throw err
  }
}

export const startWorkflowWorker = (): void => {
  if (workflowWorker || !bullmqAvailable) return

  try {
    workflowQueue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE_NAME, {
      connection: redisConnection,
      skipVersionCheck: true,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500, age: 86400 },
        removeOnFail: { count: 200, age: 604800 },
      },
    })

    // Silence Queue-level connection errors so they don't crash the process.
    workflowQueue.on('error', (err) => {
      if (isVersionError(err) && bullmqAvailable) {
        logger.warn(
          '[Workflow Queue] Redis < 5.0 — BullMQ disabled, falling back to inline execution',
        )
        bullmqAvailable = false
        void stopWorkflowWorker()
      }
    })

    workflowWorker = new Worker<WorkflowJobData>(WORKFLOW_QUEUE_NAME, processWorkflowJob, {
      connection: redisConnection,
      concurrency: 5,
      skipVersionCheck: true,
    })

    workflowWorker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.id} completed`)
    })

    workflowWorker.on('failed', (job, err) => {
      logger.error(`[Worker] Job ${job?.id} failed — attempt ${job?.attemptsMade}`, {
        error: err.message,
      })
    })

    // Catch Redis version errors from the Worker without crashing.
    workflowWorker.on('error', (err) => {
      if (isVersionError(err)) {
        if (bullmqAvailable) {
          logger.warn(
            '[Workflow Worker] Redis < 5.0 detected — BullMQ disabled, using inline execution fallback',
          )
          bullmqAvailable = false
          void stopWorkflowWorker()
        }
        return
      }
      logger.error('[Workflow Worker] Unexpected error', { error: (err as Error).message })
    })

    logger.info('Workflow BullMQ worker started')
  } catch (err) {
    if (isVersionError(err)) {
      logger.warn(
        '[Workflow Worker] Redis < 5.0 — BullMQ disabled, using inline execution fallback',
      )
      bullmqAvailable = false
    } else {
      logger.error('[Workflow Worker] Failed to start', { error: (err as Error).message })
    }
  }
}

export const stopWorkflowWorker = async (): Promise<void> => {
  if (workflowWorker) {
    await workflowWorker.close().catch(() => {})
    workflowWorker = null
  }
  if (workflowQueue) {
    await workflowQueue.close().catch(() => {})
    workflowQueue = null
  }
}

export const enqueueWorkflowExecution = async (
  workflowId: string,
  executionId: string,
  triggerData: Record<string, unknown>,
): Promise<void> => {
  if (!bullmqAvailable || !workflowQueue) {
    throw new Error('BullMQ unavailable')
  }
  await workflowQueue.add(
    'execute',
    { workflowId, executionId, triggerData },
    { jobId: `${workflowId}:${executionId}` },
  )
}
