import mongoose, { type Document, type Types } from 'mongoose'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type CaseStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'WAITING'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ESCALATED'
export type SubjectType = 'user' | 'seller' | 'order' | 'payment' | 'review' | 'promotion'
export type CaseResolution =
  | 'NO_ISSUE'
  | 'LEGITIMATE_ACTIVITY'
  | 'RESTRICTED'
  | 'BLOCKED'
  | 'MONITORED'

export interface IRiskCaseDocument extends Document {
  caseId: string
  subjectType: SubjectType
  subjectId: string
  riskLevel: RiskLevel
  riskScore: number
  status: CaseStatus
  reasonCodes: string[]
  assignedTo?: Types.ObjectId
  resolution?: CaseResolution
  resolvedAt?: Date
  moderatorNotes?: string
  appealed?: boolean
  appealNotes?: string
  createdAt: Date
  updatedAt: Date
}

const riskCaseSchema = new mongoose.Schema<IRiskCaseDocument>(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    subjectType: {
      type: String,
      enum: ['user', 'seller', 'order', 'payment', 'review', 'promotion'],
      required: true,
      index: true,
    },
    subjectId: { type: String, required: true, index: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'WAITING', 'RESOLVED', 'DISMISSED', 'ESCALATED'],
      default: 'OPEN',
      index: true,
    },
    reasonCodes: [{ type: String }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolution: {
      type: String,
      enum: ['NO_ISSUE', 'LEGITIMATE_ACTIVITY', 'RESTRICTED', 'BLOCKED', 'MONITORED'],
    },
    resolvedAt: { type: Date },
    moderatorNotes: { type: String, trim: true },
    appealed: { type: Boolean, default: false },
    appealNotes: { type: String, trim: true },
  },
  { timestamps: true },
)

export const RiskCase = mongoose.model<IRiskCaseDocument>('RiskCase', riskCaseSchema)
