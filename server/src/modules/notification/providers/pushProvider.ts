import { logger } from '../../../utils/logger.js'

export interface PushMessageInput {
  token: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export class PushProvider {
  static async send(input: PushMessageInput): Promise<{ messageId: string; success: boolean }> {
    if (!input.token || input.token.trim() === '') {
      throw new Error('Invalid push token')
    }
    // Abstracted push dispatch (WebPush / FCM simulator)
    const sanitizedToken = `${input.token.slice(0, 6)}...`
    logger.info(
      `PushProvider: Sent push notification to token=${sanitizedToken} title="${input.title}"`,
    )
    return { messageId: `push_${Date.now()}`, success: true }
  }

  static async healthCheck(): Promise<boolean> {
    return true
  }
}
