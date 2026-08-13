import mongoose, { Schema, Document } from 'mongoose'

// ─── 1. ApiKey Model ─────────────────────────────────────────────────────────
export interface IApiKey extends Document {
  apiKeyHash: string
  keyPrefix: string
  name: string
  applicationId?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  organizationId?: mongoose.Types.ObjectId
  scopes: string[]
  environment: 'development' | 'staging' | 'production'
  status: 'active' | 'revoked' | 'expired'
  expiresAt?: Date
  revokedAt?: Date
  lastUsedAt?: Date
  usageCount: number
  rateLimitRequestsPerMin: number
  createdAt: Date
  updatedAt: Date
}

const apiKeySchema = new Schema<IApiKey>(
  {
    apiKeyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'DeveloperApplication', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    scopes: [{ type: String, required: true }],
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development',
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
    usageCount: { type: Number, default: 0 },
    rateLimitRequestsPerMin: { type: Number, default: 60 },
  },
  { timestamps: true },
)

apiKeySchema.index({ userId: 1, status: 1 })
apiKeySchema.index({ keyPrefix: 1, status: 1 })

export const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', apiKeySchema)

// ─── 2. DeveloperApplication Model ──────────────────────────────────────────
export interface IDeveloperApplication extends Document {
  name: string
  description?: string
  ownerId: mongoose.Types.ObjectId
  organizationId?: mongoose.Types.ObjectId
  environment: 'development' | 'staging' | 'production'
  scopes: string[]
  status: 'active' | 'suspended' | 'archived'
  rateLimitRequestsPerMin: number
  webhookConfig?: {
    defaultUrl?: string
    secret?: string
  }
  createdAt: Date
  updatedAt: Date
}

const developerAppSchema = new Schema<IDeveloperApplication>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development',
    },
    scopes: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'suspended', 'archived'],
      default: 'active',
      index: true,
    },
    rateLimitRequestsPerMin: { type: Number, default: 120 },
    webhookConfig: {
      defaultUrl: { type: String },
      secret: { type: String },
    },
  },
  { timestamps: true },
)

export const DeveloperApplication =
  mongoose.models.DeveloperApplication ||
  mongoose.model<IDeveloperApplication>('DeveloperApplication', developerAppSchema)

// ─── 3. WebhookSubscription Model ───────────────────────────────────────────
export interface IWebhookSubscription extends Document {
  applicationId?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  url: string
  secret: string
  events: string[]
  status: 'active' | 'paused' | 'disabled'
  failureCount: number
  description?: string
  createdAt: Date
  updatedAt: Date
}

const webhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'DeveloperApplication', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true, trim: true },
    secret: { type: String, required: true },
    events: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ['active', 'paused', 'disabled'],
      default: 'active',
      index: true,
    },
    failureCount: { type: Number, default: 0 },
    description: { type: String, trim: true },
  },
  { timestamps: true },
)

export const WebhookSubscription =
  mongoose.models.WebhookSubscription ||
  mongoose.model<IWebhookSubscription>('WebhookSubscription', webhookSubscriptionSchema)

// ─── 4. WebhookDelivery Model ───────────────────────────────────────────────
export interface IWebhookDelivery extends Document {
  eventId: string
  eventType: string
  subscriptionId: mongoose.Types.ObjectId
  deliveryId: string
  url: string
  attempt: number
  maxAttempts: number
  status: 'pending' | 'success' | 'failed' | 'dead_letter'
  httpStatus?: number
  responseTimeMs?: number
  signature: string
  payload: Record<string, unknown>
  error?: string
  nextAttemptAt?: Date
  createdAt: Date
  updatedAt: Date
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'WebhookSubscription',
      required: true,
      index: true,
    },
    deliveryId: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    attempt: { type: Number, required: true, default: 1 },
    maxAttempts: { type: Number, required: true, default: 5 },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'dead_letter'],
      default: 'pending',
      index: true,
    },
    httpStatus: { type: Number },
    responseTimeMs: { type: Number },
    signature: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    error: { type: String },
    nextAttemptAt: { type: Date },
  },
  { timestamps: true },
)

webhookDeliverySchema.index({ createdAt: -1 })

export const WebhookDelivery =
  mongoose.models.WebhookDelivery ||
  mongoose.model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema)

// WebhookEvent Model
export interface IWebhookEvent extends Document {
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  timestamp: Date
  source: string
  createdAt: Date
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    source: { type: String, required: true, default: 'cartiva-system' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const WebhookEvent =
  mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema)

// ─── 5. Integration Registry & Credentials ──────────────────────────────────
export interface IIntegration extends Document {
  provider: string
  name: string
  category: 'payment' | 'shipping' | 'email' | 'ai' | 'storage' | 'analytics' | 'custom'
  status: 'active' | 'inactive' | 'error'
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'
  environment: 'development' | 'staging' | 'production'
  lastSuccessfulRequestAt?: Date
  lastFailedRequestAt?: Date
  lastErrorReason?: string
  configuration: Record<string, unknown>
  encryptedCredentials?: string
  createdAt: Date
  updatedAt: Date
}

const integrationSchema = new Schema<IIntegration>(
  {
    provider: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['payment', 'shipping', 'email', 'ai', 'storage', 'analytics', 'custom'],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active', index: true },
    healthStatus: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development',
    },
    lastSuccessfulRequestAt: { type: Date },
    lastFailedRequestAt: { type: Date },
    lastErrorReason: { type: String },
    configuration: { type: Schema.Types.Mixed, default: {} },
    encryptedCredentials: { type: String, select: false },
  },
  { timestamps: true },
)

export const Integration =
  mongoose.models.Integration || mongoose.model<IIntegration>('Integration', integrationSchema)

// ─── 6. ApiUsage & Quotas ───────────────────────────────────────────────────
export interface IApiUsage extends Document {
  apiKeyHash?: string
  applicationId?: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  endpoint: string
  method: string
  version: string
  statusCode: number
  responseTimeMs: number
  ip: string
  date: string // YYYY-MM-DD
  count: number
  createdAt: Date
}

const apiUsageSchema = new Schema<IApiUsage>(
  {
    apiKeyHash: { type: String, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'DeveloperApplication', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    endpoint: { type: String, required: true, index: true },
    method: { type: String, required: true },
    version: { type: String, default: 'v1' },
    statusCode: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true },
    ip: { type: String },
    date: { type: String, required: true, index: true },
    count: { type: Number, default: 1 },
  },
  { timestamps: true },
)

apiUsageSchema.index({ date: 1, endpoint: 1 })

export const ApiUsage =
  mongoose.models.ApiUsage || mongoose.model<IApiUsage>('ApiUsage', apiUsageSchema)

// ─── 7. ApiAuditLog ─────────────────────────────────────────────────────────
export interface IApiAuditLog extends Document {
  action: string
  actorId: mongoose.Types.ObjectId
  actorEmail?: string
  targetType: string
  targetId?: string
  details: Record<string, unknown>
  ip: string
  userAgent?: string
  createdAt: Date
}

const apiAuditLogSchema = new Schema<IApiAuditLog>(
  {
    action: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, required: true },
    userAgent: { type: String },
  },
  { timestamps: true },
)

apiAuditLogSchema.index({ createdAt: -1 })

export const ApiAuditLog =
  mongoose.models.ApiAuditLog || mongoose.model<IApiAuditLog>('ApiAuditLog', apiAuditLogSchema)
