export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired'
export type TriggerType =
  | 'order_created'
  | 'order_paid'
  | 'order_shipped'
  | 'order_delivered'
  | 'low_stock'
  | 'payment_completed'
  | 'payment_failed'
  | 'vendor_registered'
  | 'vendor_approved'
  | 'return_requested'
  | 'refund_completed'
  | 'new_customer'
  | 'customer_inactive'
  | 'scheduled'
  | 'manual'

export type ActionType =
  | 'send_notification'
  | 'send_email'
  | 'update_inventory'
  | 'generate_invoice'
  | 'create_shipment'
  | 'approve_vendor'
  | 'generate_report'
  | 'call_webhook'
  | 'log_audit'

export interface WorkflowStep {
  id: string
  name: string
  type: 'action' | 'condition' | 'delay' | 'approval'
  actionType?: ActionType
  parameters: Record<string, unknown>
  nextStepId?: string
  conditionTrueStepId?: string
  conditionFalseStepId?: string
  delayMs?: number
}

export interface IWorkflow {
  _id: string
  name: string
  description?: string
  status: WorkflowStatus
  triggerType: TriggerType
  triggerConditions: Record<string, unknown>
  steps: WorkflowStep[]
  version: number
  isActive: boolean
  executionCount: number
  lastExecutedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IWorkflowExecution {
  _id: string
  workflowId: string
  triggerType: TriggerType
  triggerData: Record<string, unknown>
  status: ExecutionStatus
  currentStepId?: string
  stepsCompleted: string[]
  stepsFailed: string[]
  logs: { stepId: string; message: string; at: string; level: 'info' | 'warn' | 'error' }[]
  startedAt?: string
  completedAt?: string
  failedAt?: string
  errorMessage?: string
  createdAt: string
}

export interface IWorkflowTemplate {
  _id: string
  name: string
  description?: string
  category: string
  triggerType: TriggerType
  steps: WorkflowStep[]
  tags: string[]
  isPublic: boolean
  usageCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IWorkflowApproval {
  _id: string
  workflowId: string
  executionId: string
  stepId: string
  title: string
  description?: string
  requestedBy: string | { name: string; email: string }
  assignedTo: string[]
  status: ApprovalStatus
  decision?: string
  decisionBy?: string
  decisionAt?: string
  dueAt?: string
  escalatedTo?: string[]
  escalatedAt?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface IWorkflowAnalytics {
  workflowId: string
  periodStart: string
  periodEnd: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  cancelledExecutions: number
  averageDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  stepFailureCounts: Record<string, number>
}

export interface IGlobalWorkflowAnalytics {
  totalWorkflows: number
  activeWorkflows: number
  totalExecutions: number
  successRate: number
  avgDurationMs: number
  topWorkflows: Array<{ name: string; executionCount: number }>
}

export interface IWorkflowAudit {
  _id: string
  workflowId: string
  executionId?: string
  action: string
  userId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  meta: Record<string, unknown>
  createdAt: string
}

export interface CreateWorkflowRequest {
  name: string
  description?: string
  triggerType: TriggerType
  triggerConditions?: Record<string, unknown>
  steps: WorkflowStep[]
}

export interface ExecuteWorkflowRequest {
  triggerData?: Record<string, unknown>
}
