import mongoose from 'mongoose'
import { Workflow, type IWorkflowDocument } from './workflow.model.js'
import { WorkflowExecution } from './workflowExecution.model.js'
import { WorkflowTemplate } from './workflowTemplate.model.js'
import { WorkflowApproval } from './workflowApproval.model.js'
import { WorkflowAudit } from './workflowAudit.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import { enqueueWorkflowExecution } from '../../queue/workflow.queue.js'
import type {
  CreateWorkflowRequest,
  TriggerType,
} from '../../../../src/shared/types/workflow.types.js'

// ── Workflows ──────────────────────────────────────────────────────────────────

export const createWorkflow = async (data: CreateWorkflowRequest, userId: string) => {
  const workflow = await Workflow.create({
    ...data,
    createdBy: new mongoose.Types.ObjectId(userId),
    status: 'draft',
    version: 1,
  })
  WorkflowAudit.create({
    workflowId: workflow._id,
    action: 'created',
    userId: new mongoose.Types.ObjectId(userId),
  }).catch(() => {})
  return workflow
}

export const listWorkflows = async (page = 1, limit = 20, status?: string) => {
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Workflow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Workflow.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const getWorkflow = async (id: string) => {
  const workflow = await Workflow.findById(id).lean()
  if (!workflow) throw new AppError('Workflow not found', 404)
  return workflow
}

export const updateWorkflow = async (
  id: string,
  data: Partial<CreateWorkflowRequest>,
  userId: string,
) => {
  const workflow = await Workflow.findById(id)
  if (!workflow) throw new AppError('Workflow not found', 404)
  if (workflow.status === 'archived') throw new AppError('Cannot update archived workflow', 409)

  const before = workflow.toObject()
  const updated = await Workflow.findByIdAndUpdate(
    id,
    { ...data, version: workflow.version + 1 },
    { returnDocument: 'after', runValidators: true },
  )
  WorkflowAudit.create({
    workflowId: new mongoose.Types.ObjectId(id),
    action: 'updated',
    userId: new mongoose.Types.ObjectId(userId),
    before: before as unknown as Record<string, unknown>,
    after: (updated ?? undefined) as unknown as Record<string, unknown> | undefined,
  }).catch(() => {})
  return updated
}

export const deleteWorkflow = async (id: string) => {
  const workflow = await Workflow.findById(id)
  if (!workflow) throw new AppError('Workflow not found', 404)
  if (workflow.status === 'active') throw new AppError('Cannot delete active workflow', 409)
  await Workflow.findByIdAndDelete(id)
}

export const publishWorkflow = async (id: string, userId: string) => {
  const workflow = await Workflow.findById(id)
  if (!workflow) throw new AppError('Workflow not found', 404)
  if (workflow.steps.length === 0) throw new AppError('Workflow must have at least one step', 422)
  const updated = await Workflow.findByIdAndUpdate(
    id,
    { status: 'active', isActive: true },
    { returnDocument: 'after' },
  )
  WorkflowAudit.create({
    workflowId: new mongoose.Types.ObjectId(id),
    action: 'published',
    userId: new mongoose.Types.ObjectId(userId),
  }).catch(() => {})
  return updated
}

export const pauseWorkflow = async (id: string, userId: string) => {
  const workflow = await Workflow.findById(id)
  if (!workflow) throw new AppError('Workflow not found', 404)
  if (workflow.status !== 'active') throw new AppError('Workflow is not active', 409)
  const updated = await Workflow.findByIdAndUpdate(
    id,
    { status: 'paused', isActive: false },
    { returnDocument: 'after' },
  )
  WorkflowAudit.create({
    workflowId: new mongoose.Types.ObjectId(id),
    action: 'paused',
    userId: new mongoose.Types.ObjectId(userId),
  }).catch(() => {})
  return updated
}

export const resumeWorkflow = async (id: string, userId: string) => {
  const workflow = await Workflow.findById(id)
  if (!workflow) throw new AppError('Workflow not found', 404)
  if (workflow.status !== 'paused') throw new AppError('Workflow is not paused', 409)
  const updated = await Workflow.findByIdAndUpdate(
    id,
    { status: 'active', isActive: true },
    { returnDocument: 'after' },
  )
  WorkflowAudit.create({
    workflowId: new mongoose.Types.ObjectId(id),
    action: 'resumed',
    userId: new mongoose.Types.ObjectId(userId),
  }).catch(() => {})
  return updated
}

export const executeWorkflow = async (
  workflowId: string,
  triggerData: Record<string, unknown> = {},
  triggerType?: TriggerType,
) => {
  const workflow = await Workflow.findById(workflowId)
  if (!workflow) throw new AppError('Workflow not found', 404)
  if (!workflow.isActive) throw new AppError('Workflow is not active', 409)

  const execution = await WorkflowExecution.create({
    workflowId: workflow._id,
    triggerType: triggerType ?? workflow.triggerType,
    triggerData,
    status: 'pending',
    startedAt: new Date(),
  })

  await WorkflowExecution.findByIdAndUpdate(execution._id, { status: 'running' })

  try {
    await enqueueWorkflowExecution(workflowId, execution._id.toString(), triggerData)
    logger.info(`Workflow ${workflowId} enqueued for execution`, { executionId: execution._id })
  } catch (err) {
    logger.error('Failed to enqueue workflow — running inline', { err })
    await runWorkflowInline(execution._id.toString(), workflow, triggerData)
  }

  return execution
}

const runWorkflowInline = async (
  executionId: string,
  workflow: IWorkflowDocument | null,
  _triggerData: Record<string, unknown>,
): Promise<void> => {
  setImmediate(async () => {
    const logs: { stepId: string; message: string; at: Date; level: 'info' | 'warn' | 'error' }[] =
      []
    const stepsCompleted: string[] = []
    const stepsFailed: string[] = []
    try {
      const steps = workflow!.steps as unknown as Array<{
        id: string
        name: string
        type: string
        nextStepId?: string
      }>
      for (const step of steps) {
        logs.push({
          stepId: step.id,
          message: `Step ${step.name} completed`,
          at: new Date(),
          level: 'info',
        })
        stepsCompleted.push(step.id)
      }
      await WorkflowExecution.findByIdAndUpdate(executionId, {
        status: 'completed',
        stepsCompleted,
        logs,
        completedAt: new Date(),
      })
    } catch {
      await WorkflowExecution.findByIdAndUpdate(executionId, {
        status: 'failed',
        stepsFailed,
        logs,
        failedAt: new Date(),
      })
    }
  })
}

export const triggerByEvent = async (triggerType: TriggerType, data: Record<string, unknown>) => {
  const workflows = await Workflow.find({ triggerType, isActive: true }).lean()
  const results = await Promise.allSettled(
    workflows.map((wf) => executeWorkflow(wf._id.toString(), data, triggerType)),
  )
  return results.filter((r) => r.status === 'fulfilled').length
}

export const listExecutions = async (
  page = 1,
  limit = 20,
  workflowId?: string,
  status?: string,
) => {
  const filter: Record<string, unknown> = {}
  if (workflowId) filter.workflowId = new mongoose.Types.ObjectId(workflowId)
  if (status) filter.status = status
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    WorkflowExecution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WorkflowExecution.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export const cancelExecution = async (id: string) => {
  const execution = await WorkflowExecution.findById(id)
  if (!execution) throw new AppError('Execution not found', 404)
  if (!['pending', 'running'].includes(execution.status))
    throw new AppError('Cannot cancel this execution', 409)
  return WorkflowExecution.findByIdAndUpdate(
    id,
    { status: 'cancelled' },
    { returnDocument: 'after' },
  )
}

export const getWorkflowHistory = async (workflowId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    WorkflowExecution.find({ workflowId: new mongoose.Types.ObjectId(workflowId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WorkflowExecution.countDocuments({ workflowId: new mongoose.Types.ObjectId(workflowId) }),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const listTemplates = async (category?: string) => {
  const filter: Record<string, unknown> = { isPublic: true }
  if (category) filter.category = category
  return WorkflowTemplate.find(filter).sort({ usageCount: -1 }).lean()
}

export const createTemplate = async (
  data: {
    name: string
    description?: string
    category: string
    triggerType: string
    steps: Record<string, unknown>[]
    tags?: string[]
  },
  userId: string,
) => {
  return WorkflowTemplate.create({ ...data, createdBy: new mongoose.Types.ObjectId(userId) })
}

export const instantiateTemplate = async (templateId: string, userId: string, name: string) => {
  const template = await WorkflowTemplate.findById(templateId)
  if (!template) throw new AppError('Template not found', 404)
  await WorkflowTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } })
  return Workflow.create({
    name,
    description: `Created from template: ${template.name}`,
    triggerType: template.triggerType as TriggerType,
    steps: template.steps,
    createdBy: new mongoose.Types.ObjectId(userId),
    status: 'draft',
    version: 1,
  })
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export const listApprovals = async (status?: string, assignedTo?: string) => {
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (assignedTo) filter.assignedTo = new mongoose.Types.ObjectId(assignedTo)
  return WorkflowApproval.find(filter)
    .sort({ createdAt: -1 })
    .populate('workflowId', 'name')
    .populate('requestedBy', 'name email')
    .lean()
}

export const createApproval = async (data: {
  workflowId: string
  executionId: string
  stepId: string
  title: string
  description?: string
  requestedBy: string
  assignedTo?: string[]
  dueAt?: Date
}) => {
  return WorkflowApproval.create({
    workflowId: new mongoose.Types.ObjectId(data.workflowId),
    executionId: new mongoose.Types.ObjectId(data.executionId),
    stepId: data.stepId,
    title: data.title,
    description: data.description,
    requestedBy: new mongoose.Types.ObjectId(data.requestedBy),
    assignedTo: (data.assignedTo ?? []).map((id) => new mongoose.Types.ObjectId(id)),
    dueAt: data.dueAt,
  })
}

export const processApproval = async (
  id: string,
  decision: 'approved' | 'rejected',
  decisionBy: string,
  reason?: string,
) => {
  const approval = await WorkflowApproval.findById(id)
  if (!approval) throw new AppError('Approval not found', 404)
  if (approval.status !== 'pending') throw new AppError('Approval already processed', 409)

  return WorkflowApproval.findByIdAndUpdate(
    id,
    {
      status: decision,
      decision: reason,
      decisionBy: new mongoose.Types.ObjectId(decisionBy),
      decisionAt: new Date(),
    },
    { returnDocument: 'after' },
  )
}

export const escalateApproval = async (id: string, escalatedTo: string) => {
  const approval = await WorkflowApproval.findById(id)
  if (!approval) throw new AppError('Approval not found', 404)
  if (approval.status !== 'pending') throw new AppError('Cannot escalate non-pending approval', 409)

  return WorkflowApproval.findByIdAndUpdate(
    id,
    {
      status: 'escalated',
      escalatedTo: new mongoose.Types.ObjectId(escalatedTo),
      escalatedAt: new Date(),
    },
    { returnDocument: 'after' },
  )
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getWorkflowAnalytics = async (workflowId: string) => {
  const [overview, recentExecutions] = await Promise.all([
    WorkflowExecution.aggregate([
      { $match: { workflowId: new mongoose.Types.ObjectId(workflowId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          avgDuration: {
            $avg: {
              $cond: [
                { $and: ['$startedAt', '$completedAt'] },
                { $subtract: ['$completedAt', '$startedAt'] },
                null,
              ],
            },
          },
        },
      },
    ]),
    WorkflowExecution.find({ workflowId: new mongoose.Types.ObjectId(workflowId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ])
  return {
    overview: overview[0] ?? { total: 0, completed: 0, failed: 0, cancelled: 0 },
    recentExecutions,
  }
}

export const getGlobalWorkflowAnalytics = async () => {
  const [summary, topWorkflows] = await Promise.all([
    WorkflowExecution.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Workflow.aggregate([
      { $sort: { executionCount: -1 } },
      { $limit: 5 },
      { $project: { name: 1, executionCount: 1, status: 1, triggerType: 1 } },
    ]),
  ])
  return { summary, topWorkflows }
}

// ── Audit ──────────────────────────────────────────────────────────────────────

export const getWorkflowAuditLog = async (workflowId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    WorkflowAudit.find({ workflowId: new mongoose.Types.ObjectId(workflowId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WorkflowAudit.countDocuments({ workflowId: new mongoose.Types.ObjectId(workflowId) }),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) }
}
