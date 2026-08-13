import type { Request, Response, NextFunction } from 'express'
import * as svc from './workflow.service.js'

export const createWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createWorkflow(req.body, req.user!.userId)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listWorkflows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>
    const data = await svc.listWorkflows(+page, +limit, status)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const getWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getWorkflow(req.params['id'] as string)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const updateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.updateWorkflow(req.params['id'] as string, req.body, req.user!.userId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const deleteWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteWorkflow(req.params['id'] as string)
    res.json({ success: true, message: 'Workflow deleted' })
  } catch (err) {
    next(err)
  }
}

export const publishWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.publishWorkflow(req.params['id'] as string, req.user!.userId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const pauseWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.pauseWorkflow(req.params['id'] as string, req.user!.userId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const resumeWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.resumeWorkflow(req.params['id'] as string, req.user!.userId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const executeWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.executeWorkflow(req.params['id'] as string, req.body.triggerData ?? {})
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listExecutions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', workflowId, status } = req.query as Record<string, string>
    const data = await svc.listExecutions(+page, +limit, workflowId, status)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const cancelExecution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.cancelExecution(req.params['id'] as string)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getWorkflowHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>
    const data = await svc.getWorkflowHistory(req.params['id'] as string, +page, +limit)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listTemplates(req.query.category as string | undefined)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createTemplate(req.body, req.user!.userId)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const instantiateTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.instantiateTemplate(
      req.params['id'] as string,
      req.user!.userId,
      req.body.name,
    )
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const listApprovals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, assignedTo } = req.query as Record<string, string>
    const data = await svc.listApprovals(status, assignedTo)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const createApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createApproval({ ...req.body, requestedBy: req.user!.userId })
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const processApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision, reason } = req.body as { decision: 'approved' | 'rejected'; reason?: string }
    const data = await svc.processApproval(
      req.params['id'] as string,
      decision,
      req.user!.userId,
      reason,
    )
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const escalateApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.escalateApproval(req.params['id'] as string, req.body.escalateTo)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getWorkflowAnalytics(req.params['id'] as string)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getGlobalAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getGlobalWorkflowAnalytics()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>
    const data = await svc.getWorkflowAuditLog(req.params['id'] as string, +page, +limit)
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}
