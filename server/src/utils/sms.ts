import axios from 'axios'
import { env } from '../config/env.js'
import { logger } from './logger.js'

export interface SmsOptions {
  to: string
  message: string
  from?: string
}

/**
 * Clean and format phone numbers to international standard (e.g. +234 or +1)
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Standard Nigerian 080... -> +23480...
    return `+234${cleaned.slice(1)}`
  }
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  return cleaned
}

/**
 * Production SMS Delivery using Termii / REST SMS Gateway with Resilient Fallback
 */
export const sendSms = async (options: SmsOptions): Promise<boolean> => {
  if (process.env.NODE_ENV === 'test') {
    logger.info(
      `[TEST MODE] SMS simulated to="${options.to}" message="${options.message.slice(0, 40)}..."`,
    )
    return true
  }

  if (!options.to || !options.message) {
    logger.warn('SMS dispatch skipped: Missing recipient phone number or message content')
    return false
  }

  const recipient = formatPhoneNumber(options.to)
  const senderId = options.from || env.SMS_FROM || 'Cartiva'
  const apiKey = env.SMS_PROVIDER_API_KEY

  if (apiKey) {
    try {
      // Termii REST SMS API
      const payload = {
        to: recipient.replace('+', ''),
        from: senderId,
        sms: options.message,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey,
      }

      const response = await axios.post('https://api.ng.termii.com/api/sms/send', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      })

      if (response.status === 200 || response.data?.code === 'ok') {
        logger.info(`SMS successfully sent to ${recipient} via Termii`)
        return true
      }
    } catch (err: any) {
      logger.warn('Primary SMS gateway delivery failed, logging for retry/audit', {
        recipient,
        error: err.response?.data || err.message,
      })
    }
  } else {
    logger.info(`SMS dispatched (dev/sandbox) to="${recipient}" text="${options.message}"`)
    return true
  }

  return false
}

/**
 * Send buyer order confirmation SMS
 */
export const sendBuyerOrderConfirmationSms = async (
  phone: string,
  orderNumber: string,
  totalAmount: number,
  currency: string,
): Promise<void> => {
  const message = `Cartiva: Your order #${orderNumber} (${currency} ${totalAmount.toFixed(2)}) is confirmed! Track real-time status at ${env.CLIENT_URL}/orders`
  await sendSms({ to: phone, message })
}

/**
 * Send buyer delivery status update SMS
 */
export const sendBuyerDeliveryUpdateSms = async (
  phone: string,
  orderNumber: string,
  status: string,
  trackingNumber?: string,
): Promise<void> => {
  const trackInfo = trackingNumber ? ` Tracking: ${trackingNumber}.` : ''
  const message = `Cartiva: Order #${orderNumber} is now ${status.toUpperCase()}.${trackInfo} View details: ${env.CLIENT_URL}/orders`
  await sendSms({ to: phone, message })
}

/**
 * Send seller new order alert SMS
 */
export const sendSellerOrderAlertSms = async (
  phone: string,
  orderNumber: string,
  netEarnings: number,
  currency: string,
): Promise<void> => {
  const message = `Cartiva Seller: You received a new paid order #${orderNumber}! Net payout: ${currency} ${netEarnings.toFixed(2)}. Fulfill now at ${env.CLIENT_URL}/seller/orders`
  await sendSms({ to: phone, message })
}
