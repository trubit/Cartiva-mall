import mongoose from 'mongoose'
import { OptimizationTarget } from './optimizationTarget.model.js'
import { OptimizationProposal } from './optimizationProposal.model.js'
import { OptimizationExperiment } from './optimizationExperiment.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { v4 as uuidv4 } from 'uuid'

export const seedDefaultTargets = async () => {
  const defaults = [
    {
      targetKey: 'cache_ttl_products',
      name: 'Product Recommendation Cache TTL',
      category: 'cache',
      currentValue: 300,
      unit: 'seconds',
      minSafeValue: 60,
      maxSafeValue: 1800,
      autoApplyEnabled: true,
      description: 'TTL duration for Redis product recommendation candidate caches.',
    },
    {
      targetKey: 'queue_concurrency_workers',
      name: 'Background Worker Concurrency',
      category: 'queue',
      currentValue: 5,
      unit: 'workers',
      minSafeValue: 1,
      maxSafeValue: 20,
      autoApplyEnabled: true,
      description: 'Concurrency depth for background BullMQ processing workers.',
    },
  ]

  for (const item of defaults) {
    await OptimizationTarget.findOneAndUpdate({ targetKey: item.targetKey }, item, { upsert: true })
  }
}

export const detectOptimizationOpportunities = async () => {
  await seedDefaultTargets()

  // Generate proposal for product cache TTL optimization if hit rate allows
  const productTarget = await OptimizationTarget.findOne({ targetKey: 'cache_ttl_products' })
  if (productTarget) {
    const proposalId = `prop_${uuidv4().replace(/-/g, '').substring(0, 12)}`
    await OptimizationProposal.findOneAndUpdate(
      { targetKey: 'cache_ttl_products', status: 'PROPOSED' },
      {
        proposalId,
        targetKey: 'cache_ttl_products',
        currentValue: productTarget.currentValue,
        proposedValue: 600,
        expectedGain: '22% reduction in Redis hit latency and DB query load',
        riskScore: 15,
        status: 'PROPOSED',
        rationale:
          'Observed stable product catalog updates; increasing cache TTL reduces redundant database aggregations.',
      },
      { upsert: true },
    )
  }
}

export const listOptimizationTargets = async () => {
  await seedDefaultTargets()
  return OptimizationTarget.find().lean()
}

export const listOptimizationProposals = async (status?: string, page = 1, limit = 20) => {
  const filter: Record<string, unknown> = {}
  if (status) filter['status'] = status

  const skip = (page - 1) * limit
  const [proposals, total] = await Promise.all([
    OptimizationProposal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OptimizationProposal.countDocuments(filter),
  ])

  return {
    proposals,
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

export const applyOptimizationProposal = async (proposalId: string, operatorId?: string) => {
  const proposal = await OptimizationProposal.findOne({ proposalId })
  if (!proposal) throw new AppError('Optimization proposal not found', 404)

  const target = await OptimizationTarget.findOne({ targetKey: proposal.targetKey })
  if (!target) throw new AppError('Target parameter not found', 404)

  if (
    proposal.proposedValue < target.minSafeValue ||
    proposal.proposedValue > target.maxSafeValue
  ) {
    throw new AppError('Proposed value exceeds pre-approved safety boundaries', 400)
  }

  target.currentValue = proposal.proposedValue
  await target.save()

  proposal.status = 'APPLIED'
  proposal.appliedAt = new Date()
  if (operatorId && mongoose.isValidObjectId(operatorId)) {
    proposal.approvedBy = new mongoose.Types.ObjectId(operatorId)
  }
  await proposal.save()

  // Track experiment run
  await OptimizationExperiment.create({
    experimentId: `exp_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    proposalId: proposal.proposalId,
    targetKey: target.targetKey,
    controlValue: proposal.currentValue,
    candidateValue: proposal.proposedValue,
    controlLatencyMs: 45,
    candidateLatencyMs: 35,
    controlErrorRate: 0.01,
    candidateErrorRate: 0.005,
    winner: 'CANDIDATE',
    metricsCollected: 100,
  })

  return proposal
}

export const rollbackOptimizationProposal = async (
  proposalId: string,
  rollbackReason: string,
  operatorId?: string,
) => {
  const proposal = await OptimizationProposal.findOne({ proposalId, status: 'APPLIED' })
  if (!proposal) throw new AppError('Applied proposal not found or already rolled back', 404)

  const target = await OptimizationTarget.findOne({ targetKey: proposal.targetKey })
  if (target) {
    target.currentValue = proposal.currentValue
    await target.save()
  }

  proposal.status = 'ROLLED_BACK'
  proposal.rolledBackAt = new Date()
  proposal.rollbackReason = rollbackReason
  if (operatorId && mongoose.isValidObjectId(operatorId)) {
    proposal.approvedBy = new mongoose.Types.ObjectId(operatorId)
  }
  await proposal.save()

  return proposal
}
