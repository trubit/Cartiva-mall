import mongoose, { Schema, type Document } from 'mongoose'

export type IntegrationType =
  | 'INTERNAL_SERVICE'
  | 'EXTERNAL_API'
  | 'PARTNER'
  | 'WEBHOOK'
  | 'EVENT_CONSUMER'
  | 'EVENT_PRODUCER'
  | 'OAUTH_APPLICATION'
  | 'DEVELOPER_APPLICATION'

export type IntegrationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISABLED'
  | 'REVOKED'
  | 'FAILED'
export type AuthMethod = 'API_KEY' | 'OAUTH2' | 'HMAC_SIGNATURE' | 'MUTUAL_TLS'
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface IEcosystemIntegrationDocument extends Document {
  integrationId: string
  name: string
  description: string
  type: IntegrationType
  owner: string
  status: IntegrationStatus
  version: string
  authenticationMethod: AuthMethod
  allowedScopes: string[]
  rateLimit: number // requests / minute
  timeoutMs: number
  circuitBreakerStatus: CircuitState
  failedRequestsCount: number
  lastSuccessAt?: Date
  lastFailureAt?: Date
  partnerId?: mongoose.Types.ObjectId
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

const EcosystemIntegrationSchema = new Schema<IEcosystemIntegrationDocument>(
  {
    integrationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'INTERNAL_SERVICE',
        'EXTERNAL_API',
        'PARTNER',
        'WEBHOOK',
        'EVENT_CONSUMER',
        'EVENT_PRODUCER',
        'OAUTH_APPLICATION',
        'DEVELOPER_APPLICATION',
      ],
      default: 'EXTERNAL_API',
      index: true,
    },
    owner: { type: String, required: true, default: 'system' },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED', 'REVOKED', 'FAILED'],
      default: 'ACTIVE',
      index: true,
    },
    version: { type: String, default: 'v1.0.0' },
    authenticationMethod: {
      type: String,
      enum: ['API_KEY', 'OAUTH2', 'HMAC_SIGNATURE', 'MUTUAL_TLS'],
      default: 'API_KEY',
    },
    allowedScopes: [{ type: String }],
    rateLimit: { type: Number, default: 120 },
    timeoutMs: { type: Number, default: 5000 },
    circuitBreakerStatus: {
      type: String,
      enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
      default: 'CLOSED',
    },
    failedRequestsCount: { type: Number, default: 0 },
    lastSuccessAt: { type: Date },
    lastFailureAt: { type: Date },
    partnerId: { type: Schema.Types.ObjectId, ref: 'PartnerAccount', index: true },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
)

export const EcosystemIntegration =
  mongoose.models.EcosystemIntegration ||
  mongoose.model<IEcosystemIntegrationDocument>('EcosystemIntegration', EcosystemIntegrationSchema)
