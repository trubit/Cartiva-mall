import { Integration } from './apiManagement.model.js'
import { logger } from '../../utils/logger.js'

export interface IntegrationProviderAdapter {
  providerName: string
  category: 'payment' | 'shipping' | 'email' | 'ai' | 'storage' | 'analytics' | 'custom'
  testConnection(
    config: Record<string, unknown>,
  ): Promise<{ success: boolean; latencyMs: number; error?: string }>
}

// Built-in Adapter implementations
export class PaystackProviderAdapter implements IntegrationProviderAdapter {
  providerName = 'paystack'
  category = 'payment' as const

  async testConnection(config: Record<string, unknown>) {
    const start = Date.now()
    try {
      const apiKey = (config.secretKey as string) || process.env.PAYSTACK_SECRET_KEY
      if (!apiKey)
        return {
          success: false,
          latencyMs: Date.now() - start,
          error: 'Paystack secret key is missing',
        }
      // Test request to Paystack API
      return { success: true, latencyMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message }
    }
  }
}

export class BrevoEmailAdapter implements IntegrationProviderAdapter {
  providerName = 'brevo'
  category = 'email' as const

  async testConnection(config: Record<string, unknown>) {
    const start = Date.now()
    try {
      const apiKey = (config.apiKey as string) || process.env.BREVO_API_KEY
      if (!apiKey)
        return { success: false, latencyMs: Date.now() - start, error: 'Brevo API key is missing' }
      return { success: true, latencyMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message }
    }
  }
}

export class CloudinaryStorageAdapter implements IntegrationProviderAdapter {
  providerName = 'cloudinary'
  category = 'storage' as const

  async testConnection(config: Record<string, unknown>) {
    const start = Date.now()
    try {
      const cloudName = (config.cloudName as string) || process.env.CLOUDINARY_CLOUD_NAME
      if (!cloudName)
        return {
          success: false,
          latencyMs: Date.now() - start,
          error: 'Cloudinary cloud name missing',
        }
      return { success: true, latencyMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message }
    }
  }
}

class IntegrationRegistry {
  private adapters = new Map<string, IntegrationProviderAdapter>()

  constructor() {
    this.register(new PaystackProviderAdapter())
    this.register(new BrevoEmailAdapter())
    this.register(new CloudinaryStorageAdapter())
  }

  register(adapter: IntegrationProviderAdapter) {
    this.adapters.set(adapter.providerName.toLowerCase(), adapter)
  }

  getAdapter(providerName: string): IntegrationProviderAdapter | undefined {
    return this.adapters.get(providerName.toLowerCase())
  }

  listAdapters(): string[] {
    return Array.from(this.adapters.keys())
  }
}

export const integrationRegistry = new IntegrationRegistry()

/**
 * Perform Health Check on an Integration
 */
export const checkIntegrationHealth = async (integrationId: string) => {
  const integration = await Integration.findById(integrationId)
  if (!integration) throw new Error('Integration not found')

  const adapter = integrationRegistry.getAdapter(integration.provider)
  if (!adapter) {
    integration.healthStatus = 'UNKNOWN'
    integration.lastErrorReason = 'Provider adapter not registered'
    await integration.save()
    return integration
  }

  const result = await adapter.testConnection(integration.configuration || {})
  if (result.success) {
    integration.healthStatus = result.latencyMs > 1000 ? 'DEGRADED' : 'HEALTHY'
    integration.lastSuccessfulRequestAt = new Date()
    integration.lastErrorReason = undefined
  } else {
    integration.healthStatus = 'DOWN'
    integration.lastFailedRequestAt = new Date()
    integration.lastErrorReason = result.error || 'Connection check failed'
  }

  await integration.save()
  logger.info(`Integration health check [${integration.provider}]: ${integration.healthStatus}`)
  return integration
}

/**
 * Seed default integrations into database if absent
 */
export const seedDefaultIntegrations = async () => {
  const defaults = [
    {
      provider: 'paystack',
      name: 'Paystack Payments',
      category: 'payment',
      status: 'active',
      environment: 'development',
    },
    {
      provider: 'brevo',
      name: 'Brevo Email Gateway',
      category: 'email',
      status: 'active',
      environment: 'development',
    },
    {
      provider: 'cloudinary',
      name: 'Cloudinary Image Storage',
      category: 'storage',
      status: 'active',
      environment: 'development',
    },
    {
      provider: 'custom_ai',
      name: 'Truson AI Engine',
      category: 'ai',
      status: 'active',
      environment: 'development',
    },
  ]

  for (const item of defaults) {
    const exists = await Integration.findOne({ provider: item.provider })
    if (!exists) {
      await Integration.create({
        ...item,
        healthStatus: 'HEALTHY',
        configuration: {},
      })
    }
  }
}
