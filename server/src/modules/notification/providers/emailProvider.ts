import { sendEmail } from '../../../utils/email.js'
import { logger } from '../../../utils/logger.js'

export interface EmailMessageInput {
  to: string
  subject: string
  body: string
}

export class EmailProvider {
  static async send(input: EmailMessageInput): Promise<{ messageId: string; success: boolean }> {
    try {
      await sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.body,
      })
      return { messageId: `msg_${Date.now()}`, success: true }
    } catch (err) {
      logger.error('EmailProvider error sending email', { to: input.to, error: err })
      throw err
    }
  }

  static async healthCheck(): Promise<boolean> {
    return true
  }
}
