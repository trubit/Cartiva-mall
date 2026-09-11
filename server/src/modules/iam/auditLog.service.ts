import { SecurityEvent } from './securityEvent.model.js'

export interface LogSecurityEventOptions {
  eventType: string
  userId?: string
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'critical'
}

export async function logSecurityEvent(options: LogSecurityEventOptions): Promise<void> {
  try {
    await SecurityEvent.create({
      eventType: options.eventType,
      userId: options.userId,
      ip: options.ip,
      userAgent: options.userAgent,
      details: options.details || {},
      severity: options.severity || 'info',
    })
  } catch {
    // Fail silently on audit logging errors so core business flow is not interrupted
  }
}
