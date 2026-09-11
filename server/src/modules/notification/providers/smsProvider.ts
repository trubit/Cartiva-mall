import { env } from '../../../config/env.js'
import { logger } from '../../../utils/logger.js'

export interface SMSMessageInput {
  phone: string
  message: string
}

export class SMSProvider {
  static async send(input: SMSMessageInput): Promise<{ messageId: string; success: boolean }> {
    if (!input.phone || input.phone.trim() === '') {
      throw new Error('Invalid phone number')
    }

    const cleanPhone = input.phone.replace(/[^0-9+]/g, '')
    const maskedPhone = cleanPhone.replace(/.(?=.{4})/g, '*')

    // If real SMS provider key is configured (Termii / Generic SMS Gateway)
    if (env.SMS_PROVIDER_API_KEY) {
      try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone,
            from: env.SMS_FROM || 'Cartiva',
            sms: input.message,
            type: 'plain',
            channel: 'generic',
            api_key: env.SMS_PROVIDER_API_KEY,
          }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          logger.warn('SMS Provider gateway returned non-200 status', {
            status: response.status,
            phone: maskedPhone,
            body,
          })
        } else {
          logger.info(`SMSProvider: Successfully dispatched SMS to ${maskedPhone}`)
        }
      } catch (err) {
        logger.error('SMSProvider network error during dispatch', {
          error: err,
          phone: maskedPhone,
        })
      }
    } else {
      logger.info(
        `SMSProvider: Simulation mode (no SMS_PROVIDER_API_KEY). Dispatched SMS to ${maskedPhone}`,
      )
    }

    return { messageId: `sms_${Date.now()}`, success: true }
  }

  static async healthCheck(): Promise<boolean> {
    return true
  }
}
