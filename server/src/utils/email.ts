import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'
import { callBrevo } from './circuit-breakers.js'

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// ─── Brevo REST API (Preferred) ────────────────────────────────────────────────
const sendViaBrevoAPI = async (
  options: MailOptions & { from: string; fromName: string },
): Promise<void> => {
  await callBrevo(async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: options.fromName, email: options.from },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent:
            options.text ??
            options.html
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          `Brevo API error ${res.status}: ${(body as { message?: string }).message ?? res.statusText}`,
        )
      }
    } finally {
      clearTimeout(timeout)
    }
  })
}

// ─── Brevo SMTP Relay (Tier 2 Fallback) ─────────────────────────────────────────
const sendViaBrevoSMTP = async (options: MailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: env.EMAIL_PORT || 587,
    secure: false,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    connectionTimeout: 10000,
  })

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

// ─── Ethereal Fallback (Tier 3 Dev Preview) ────────────────────────────────────
let _ethereal: nodemailer.Transporter | null = null

const sendViaEthereal = async (options: MailOptions): Promise<void> => {
  if (!_ethereal) {
    const acc = await nodemailer.createTestAccount()
    logger.warn(
      'Using Ethereal preview fallback (check server terminal logs for email preview URL)',
    )
    _ethereal = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: acc.user, pass: acc.pass },
    })
  }
  const info = await _ethereal.sendMail({
    from: '"Cartiva" <noreply@cartiva.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
  const url = nodemailer.getTestMessageUrl(info)
  logger.info('─── EMAIL PREVIEW ────────────────────────────────────')
  logger.info(`To:      ${options.to}`)
  logger.info(`Subject: ${options.subject}`)
  logger.info(`Preview: ${url}`)
  logger.info('──────────────────────────────────────────────────────')
}

// ─── Parse EMAIL_FROM "Name <email@example.com>" ─────────────────────────────
const parseFrom = (from: string): { name: string; email: string } => {
  const m = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (m) return { name: m[1].trim(), email: m[2].trim() }
  return { name: 'Cartiva', email: from.trim() }
}

// ─── Startup check ─────────────────────────────────────────────────────────────
export const verifyEmailConfig = async (): Promise<void> => {
  if (env.BREVO_API_KEY) {
    logger.info(`Email ready  provider=Brevo-API  from="${env.EMAIL_FROM}"`)
  } else {
    logger.warn('Email BREVO_API_KEY not set — using local preview fallback')
  }
}

// ─── Core send with resilient multi-tier delivery ─────────────────────────────
export const sendEmail = async (options: MailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    logger.info(`[TEST MODE] Email simulated to="${options.to}" subject="${options.subject}"`)
    return
  }

  if (env.BREVO_API_KEY) {
    try {
      const { name, email } = parseFrom(env.EMAIL_FROM || env.EMAIL_USER || 'noreply@cartiva.com')
      await sendViaBrevoAPI({ ...options, from: email, fromName: name })
      logger.info(`Email delivered via Brevo API  to="${options.to}"  subject="${options.subject}"`)
      return
    } catch (apiErr) {
      logger.warn('Brevo REST API attempt failed, trying Brevo SMTP fallback...', {
        error: (apiErr as Error).message,
      })

      if (env.EMAIL_USER && env.EMAIL_PASS) {
        try {
          await sendViaBrevoSMTP(options)
          logger.info(
            `Email delivered via Brevo SMTP relay  to="${options.to}"  subject="${options.subject}"`,
          )
          return
        } catch (smtpErr) {
          logger.warn('Brevo SMTP relay failed, attempting Ethereal preview fallback...', {
            error: (smtpErr as Error).message,
          })
        }
      }
    }
  }

  // Fallback to local Ethereal preview if external networks block live delivery
  await sendViaEthereal(options)
}

// ─── Production OTP Email: Email Verification ─────────────────────────────────
export const sendEmailVerificationOtp = async (
  to: string,
  firstName: string,
  otp: string,
): Promise<void> => {
  await sendEmail({
    to,
    subject: `${otp} is your Cartiva verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">CARTIVA</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Secure Authentication System</p>
        </div>
        <div style="padding: 36px 36px 28px;">
          <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Welcome to Cartiva, ${firstName || 'there'}!</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 24px; font-size: 15px;">
            Please use the following 6-digit verification code to confirm your email address and activate your account.
          </p>
          
          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; display: inline-block; padding-left: 8px;">${otp}</span>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 0 0 24px;">
            <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
              ⏱️ This code expires in <strong>10 minutes</strong>. If you did not sign up for a Cartiva account, you can safely ignore this email.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            🔒 <strong>Security Warning:</strong> Never share this verification code with anyone. Cartiva customer service will never ask you for your code.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 18px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartiva, Inc. · Global Commerce Platform</p>
        </div>
      </div>`,
    text: `Your Cartiva email verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not sign up for Cartiva, please ignore this email.`,
  })
}

// ─── Production OTP Email: Password Reset ─────────────────────────────────────
export const sendPasswordResetOtp = async (
  to: string,
  firstName: string,
  otp: string,
): Promise<void> => {
  await sendEmail({
    to,
    subject: `${otp} is your Cartiva password reset code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">CARTIVA</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Security & Account Recovery</p>
        </div>
        <div style="padding: 36px 36px 28px;">
          <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 24px; font-size: 15px;">
            Hi ${firstName || 'Valued User'}, we received a request to reset your password. Use the 6-digit code below to securely set a new password:
          </p>
          
          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; display: inline-block; padding-left: 8px;">${otp}</span>
          </div>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin: 0 0 24px;">
            <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.5;">
              ⏱️ This code expires in <strong>10 minutes</strong>. If you did not initiate this request, your account may be compromised. Please secure your account immediately.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            🔒 <strong>Security Warning:</strong> Never share this verification code with anyone. Cartiva staff will never ask for this code.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 18px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartiva, Inc. · Global Commerce Platform</p>
        </div>
      </div>`,
    text: `Your Cartiva password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, please secure your account immediately.`,
  })
}

// ─── Backward compatibility token emails (if link clicked) ───────────────────
export const sendVerificationEmail = async (
  to: string,
  firstName: string,
  token: string,
): Promise<void> => {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`
  await sendEmail({
    to,
    subject: 'Verify your Cartiva email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
        <div style="background:#131921;padding:24px 32px;">
          <h1 style="color:#FF9900;margin:0;font-size:22px;letter-spacing:.5px;">Cartiva</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#131921;margin:0 0 12px;">Welcome, ${firstName}!</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px;">
            Thanks for signing up. Click the button below to verify your email address and activate your account.
          </p>
          <a href="${url}"
            style="display:inline-block;padding:13px 32px;background:#FF9900;color:#131921;
                   font-weight:700;border-radius:6px;text-decoration:none;font-size:15px;">
            Verify My Email
          </a>
          <p style="color:#999;font-size:13px;margin:24px 0 0;">
            This link expires in <strong>24 hours</strong>.<br>
            If you didn't create an account, ignore this email.
          </p>
        </div>
        <div style="background:#f7f7f7;padding:16px 32px;border-top:1px solid #eee;">
          <p style="color:#aaa;font-size:12px;margin:0;">© Cartiva · Trusted Marketplace</p>
        </div>
      </div>`,
  })
}

export const sendPasswordResetEmail = async (
  to: string,
  firstName: string,
  token: string,
): Promise<void> => {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`
  await sendEmail({
    to,
    subject: 'Reset your Cartiva password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
        <div style="background:#131921;padding:24px 32px;">
          <h1 style="color:#FF9900;margin:0;font-size:22px;letter-spacing:.5px;">Cartiva</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#131921;margin:0 0 12px;">Password Reset</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px;">
            Hi ${firstName}, we received a request to reset your Cartiva password.
          </p>
          <a href="${url}"
            style="display:inline-block;padding:13px 32px;background:#FF9900;color:#131921;
                   font-weight:700;border-radius:6px;text-decoration:none;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#999;font-size:13px;margin:24px 0 0;">
            This link expires in <strong>1 hour</strong>.<br>
            If you didn't request this, ignore this email — your password won't change.
          </p>
        </div>
        <div style="background:#f7f7f7;padding:16px 32px;border-top:1px solid #eee;">
          <p style="color:#aaa;font-size:12px;margin:0;">© Cartiva · Trusted Marketplace</p>
        </div>
      </div>`,
  })
}

// ─── Production Seller Paid Order Notification Email ──────────────────────────
export interface SellerOrderItemSummary {
  title: string
  quantity: number
  price: number
  lineTotal: number
}

export const sendSellerOrderNotificationEmail = async (
  to: string,
  sellerName: string,
  orderNumber: string,
  currency: string,
  items: SellerOrderItemSummary[],
  grossTotal: number,
  commissionTotal: number,
  netEarnings: number,
): Promise<void> => {
  const orderUrl = `${env.CLIENT_URL}/seller/orders`

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-weight: 600; color: #1e293b; font-size: 14px;">${item.title}</td>
        <td style="padding: 12px 8px; text-align: center; color: #475569; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; color: #475569; font-size: 14px;">${currency} ${item.price.toFixed(2)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${currency} ${item.lineTotal.toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  await sendEmail({
    to,
    subject: `Cartiva — New Paid Order Received (#${orderNumber})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0B2D3D 0%, #131921 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">CARTIVA SELLER HUB</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Official Paid Order Notification</p>
        </div>
        <div style="padding: 32px 36px;">
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0;">
              🎉 You have received a new paid order!
            </p>
            <p style="color: #047857; font-size: 12px; margin: 4px 0 0;">
              Order <strong>#${orderNumber}</strong> has been successfully paid and confirmed.
            </p>
          </div>

          <p style="color: #334155; font-size: 14px; margin: 0 0 16px;">
            Hello <strong>${sellerName || 'Seller'}</strong>, a customer purchased your product(s). Here is the breakdown:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: center;">Qty</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: right;">Unit Price</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #475569;">
              <span>Product Gross Sales:</span>
              <span>${currency} ${grossTotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #475569;">
              <span>Cartiva Marketplace Commission:</span>
              <span>- ${currency} ${commissionTotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 15px; font-weight: 700; color: #0f172a;">
              <span>Your Net Payout:</span>
              <span style="color: #059669;">${currency} ${netEarnings.toFixed(2)}</span>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${orderUrl}"
              style="display: inline-block; padding: 14px 36px; background: #FF9900; color: #131921; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              View & Fulfill Order
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            📦 Please fulfill and update tracking for this order promptly to maintain excellent seller ratings on Cartiva.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartiva Mall · Autonomous Multi-Vendor Commerce</p>
        </div>
      </div>`,
    text: `New Paid Order Received: #${orderNumber}\n\nHello ${sellerName},\nA customer has purchased your product(s) on Cartiva.\nGross Sales: ${currency} ${grossTotal.toFixed(2)}\nCartiva Commission: ${currency} ${commissionTotal.toFixed(2)}\nYour Net Earnings: ${currency} ${netEarnings.toFixed(2)}\n\nPlease log in to your Seller Dashboard to process and fulfill the order: ${orderUrl}`,
  })
}

// ─── Production Buyer Order Confirmation Email ────────────────────────────────
export const sendBuyerOrderConfirmationEmail = async (
  to: string,
  buyerName: string,
  orderNumber: string,
  currency: string,
  items: SellerOrderItemSummary[],
  grandTotal: number,
): Promise<void> => {
  const orderUrl = `${env.CLIENT_URL}/orders`
  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-weight: 600; color: #1e293b; font-size: 14px;">${item.title}</td>
        <td style="padding: 12px 8px; text-align: center; color: #475569; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; color: #475569; font-size: 14px;">${currency} ${item.price.toFixed(2)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${currency} ${item.lineTotal.toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  await sendEmail({
    to,
    subject: `Order Confirmed: #${orderNumber} — Cartiva Mall`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">CARTIVA MALL</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Payment Confirmation & Receipt</p>
        </div>
        <div style="padding: 32px 36px;">
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="color: #065f46; font-size: 15px; font-weight: 700; margin: 0;">
              ✓ Thank you for your purchase!
            </p>
            <p style="color: #047857; font-size: 13px; margin: 4px 0 0;">
              Your order <strong>#${orderNumber}</strong> has been successfully placed and confirmed.
            </p>
          </div>

          <p style="color: #334155; font-size: 14px; margin: 0 0 16px;">
            Hi <strong>${buyerName || 'Valued Customer'}</strong>, we're preparing your order for fulfillment.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase;">Item</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: center;">Qty</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: right;">Price</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #0f172a;">
              <span>Total Paid:</span>
              <span style="color: #059669;">${currency} ${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${orderUrl}"
              style="display: inline-block; padding: 14px 36px; background: #FF9900; color: #131921; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 15px;">
              Track Order Real-Time
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartiva Mall · Trusted Marketplace</p>
        </div>
      </div>`,
    text: `Order Confirmed: #${orderNumber}\n\nHi ${buyerName},\nThank you for shopping at Cartiva!\nTotal Paid: ${currency} ${grandTotal.toFixed(2)}\n\nTrack your order in real time: ${orderUrl}`,
  })
}

// ─── Production Order Status & Delivery Milestone Email ───────────────────────
export const sendOrderStatusUpdateEmail = async (
  to: string,
  buyerName: string,
  orderNumber: string,
  status: string,
  carrier?: string,
  trackingNumber?: string,
  trackingUrl?: string,
): Promise<void> => {
  const orderUrl = `${env.CLIENT_URL}/orders`
  const statusDisplay = status.toUpperCase().replace(/_/g, ' ')

  await sendEmail({
    to,
    subject: `Order #${orderNumber} Update: ${statusDisplay}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">CARTIVA LOGISTICS</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Shipment Milestone Notification</p>
        </div>
        <div style="padding: 32px 36px;">
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="color: #1e40af; font-size: 15px; font-weight: 700; margin: 0;">
              📦 Shipment Update: ${statusDisplay}
            </p>
            <p style="color: #1d4ed8; font-size: 13px; margin: 4px 0 0;">
              Your order <strong>#${orderNumber}</strong> has reached the <strong>${statusDisplay}</strong> milestone.
            </p>
          </div>

          ${
            carrier || trackingNumber
              ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h4 style="margin: 0 0 8px; color: #0f172a; font-size: 13px; text-transform: uppercase;">Tracking Details</h4>
            ${carrier ? `<p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Carrier:</strong> ${carrier}</p>` : ''}
            ${trackingNumber ? `<p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
            ${trackingUrl ? `<p style="margin: 4px 0; font-size: 14px;"><a href="${trackingUrl}" style="color: #3b82f6; text-decoration: underline;">Track via Carrier Website</a></p>` : ''}
          </div>`
              : ''
          }

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${orderUrl}"
              style="display: inline-block; padding: 14px 36px; background: #FF9900; color: #131921; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 15px;">
              View Live Tracking in App
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartiva Mall · Autonomous Logistics Network</p>
        </div>
      </div>`,
    text: `Order #${orderNumber} Update: ${statusDisplay}\n\nHi ${buyerName},\nYour order has been updated to: ${statusDisplay}.\n${carrier ? `Carrier: ${carrier}\n` : ''}${trackingNumber ? `Tracking Number: ${trackingNumber}\n` : ''}\nView in your account: ${orderUrl}`,
  })
}
