import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'
import { callBrevo } from './circuit-breakers.js'
import { AppError } from '../middlewares/error.middleware.js'

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// ─── Brevo REST API (Preferred when REST API key xkeysib- is present) ────────
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

// ─── Brevo / Standard SMTP Relay (High-Performance Pooled Transporter) ────────
let _smtpTransporter: Transporter | null = null

const getSmtpTransporter = (): Transporter => {
  if (!_smtpTransporter) {
    const smtpPass = env.EMAIL_PASS || env.BREVO_API_KEY
    const isSecure = env.EMAIL_PORT === 465

    _smtpTransporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: env.EMAIL_HOST || 'smtp-relay.brevo.com',
      port: env.EMAIL_PORT || 587,
      secure: isSecure,
      auth: {
        user: env.EMAIL_USER,
        pass: smtpPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    })
  }
  return _smtpTransporter
}

const sendViaBrevoSMTP = async (options: MailOptions): Promise<void> => {
  const transporter = getSmtpTransporter()
  const { name, email } = parseFrom(
    env.EMAIL_FROM || env.EMAIL_USER || 'Cartiva <noreply@cartiva.com>',
  )

  await transporter.sendMail({
    from: `"${name}" <${email}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

// ─── Ethereal Fallback (Tier 3 Dev Preview Only) ──────────────────────────────
let _ethereal: Transporter | null = null

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
  return { name: 'Cartival Mall', email: from.trim() }
}

// ─── Startup check ─────────────────────────────────────────────────────────────
export const verifyEmailConfig = async (): Promise<void> => {
  const hasRestKey = Boolean(env.BREVO_API_KEY && !env.BREVO_API_KEY.startsWith('xsmtpsib'))
  const hasSmtpCreds = Boolean(env.EMAIL_USER && (env.EMAIL_PASS || env.BREVO_API_KEY))

  if (hasRestKey) {
    logger.info(`Email ready  provider=Brevo-API  from="${env.EMAIL_FROM}"`)
  } else if (hasSmtpCreds) {
    logger.info(
      `Email ready  provider=Brevo-SMTP  host="${env.EMAIL_HOST}:${env.EMAIL_PORT}"  user="${env.EMAIL_USER}"  from="${env.EMAIL_FROM}"`,
    )
    getSmtpTransporter()
      .verify()
      .then(() => logger.info('Brevo SMTP relay connection verified successfully'))
      .catch((err) =>
        logger.warn('Brevo SMTP initial verification warning', { error: (err as Error).message }),
      )
  } else {
    logger.warn('No production email credentials configured — falling back to local preview')
  }
}

// ─── Core send with resilient multi-tier delivery ─────────────────────────────
export const sendEmail = async (options: MailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    logger.info(`[TEST MODE] Email simulated to="${options.to}" subject="${options.subject}"`)
    return
  }

  const hasRestKey = Boolean(env.BREVO_API_KEY && !env.BREVO_API_KEY.startsWith('xsmtpsib'))
  const hasSmtpCreds = Boolean(env.EMAIL_USER && (env.EMAIL_PASS || env.BREVO_API_KEY))

  let lastError: Error | null = null

  // Tier 1: Brevo REST API (only if a valid non-SMTP Brevo API key is configured)
  if (hasRestKey) {
    try {
      const { name, email } = parseFrom(env.EMAIL_FROM || env.EMAIL_USER || 'noreply@cartiva.com')
      await sendViaBrevoAPI({ ...options, from: email, fromName: name })
      logger.info(`Email delivered via Brevo API  to="${options.to}"  subject="${options.subject}"`)
      return
    } catch (apiErr) {
      lastError = apiErr as Error
      logger.warn('Brevo REST API attempt failed, trying Brevo SMTP fallback...', {
        error: (apiErr as Error).message,
      })
    }
  }

  // Tier 2: Brevo / Standard SMTP Relay (direct or fallback)
  if (hasSmtpCreds) {
    try {
      await sendViaBrevoSMTP(options)
      logger.info(
        `Email delivered via SMTP relay  to="${options.to}"  subject="${options.subject}"`,
      )
      return
    } catch (smtpErr) {
      lastError = smtpErr as Error
      logger.warn('SMTP relay delivery failed', {
        error: (smtpErr as Error).message,
      })
    }
  }

  // Tier 3: In production, do NOT pretend success with Ethereal — throw error so caller knows
  if (env.isProd()) {
    logger.error('All production email delivery methods failed', {
      to: options.to,
      subject: options.subject,
      lastError: lastError?.message,
    })
    throw new AppError('Failed to send verification email. Please try again.', 500)
  }

  // Tier 3: Local Dev Preview fallback
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
    subject: `${otp} is your Cartival Mall verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">CARTIVAL MALL</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Secure Authentication System</p>
        </div>
        <div style="padding: 36px 36px 28px;">
          <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Welcome to Cartival Mall, ${firstName || 'there'}!</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 24px; font-size: 15px;">
            Please use the following 6-digit verification code to confirm your email address and activate your account.
          </p>
          
          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; display: inline-block; padding-left: 8px;">${otp}</span>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 0 0 24px;">
            <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
              ⏱️ This code expires in <strong>10 minutes</strong>. If you did not sign up for a Cartival Mall account, you can safely ignore this email.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            🔒 <strong>Security Warning:</strong> Never share this verification code with anyone. Cartival Mall customer service will never ask you for your code.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 18px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartival Mall, Inc. · Global Commerce Platform</p>
        </div>
      </div>`,
    text: `Your Cartival Mall email verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not sign up for Cartival Mall, please ignore this email.`,
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
    subject: `${otp} is your Cartival Mall password reset code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">CARTIVAL MALL</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Security & Account Recovery</p>
        </div>
        <div style="padding: 36px 36px 28px;">
          <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 24px; font-size: 15px;">
            Hi ${firstName || 'Valued User'}, we received a request to reset your Cartival Mall password. Use the 6-digit code below to securely set a new password:
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
            🔒 <strong>Security Warning:</strong> Never share this verification code with anyone. Cartival Mall staff will never ask for this code.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 18px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartival Mall, Inc. · Global Commerce Platform</p>
        </div>
      </div>`,
    text: `Your Cartival Mall password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, please secure your account immediately.`,
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
    subject: 'Verify your Cartival Mall email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
        <div style="background:#131921;padding:24px 32px;">
          <h1 style="color:#FF9900;margin:0;font-size:22px;letter-spacing:.5px;">Cartival Mall</h1>
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
          <p style="color:#aaa;font-size:12px;margin:0;">© Cartival Mall · Trusted Marketplace</p>
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
    subject: 'Reset your Cartival Mall password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
        <div style="background:#131921;padding:24px 32px;">
          <h1 style="color:#FF9900;margin:0;font-size:22px;letter-spacing:.5px;">Cartival Mall</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#131921;margin:0 0 12px;">Password Reset</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px;">
            Hi ${firstName}, we received a request to reset your Cartival Mall password.
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
          <p style="color:#aaa;font-size:12px;margin:0;">© Cartival Mall · Trusted Marketplace</p>
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
  _sellerName: string,
  orderNumber: string,
  currency: string,
  items: SellerOrderItemSummary[],
  grossTotal: number,
  commissionTotal: number,
  netEarnings: number,
  shippingFee: number = 0,
  orderDate: Date | string = new Date(),
): Promise<void> => {
  const orderUrl = `${env.CLIENT_URL}/seller/orders`

  const dateObj = typeof orderDate === 'string' ? new Date(orderDate) : orderDate
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const productSummary =
    items && items.length > 0
      ? items.map((it) => `${it.title} (Qty: ${it.quantity})`).join(', ')
      : 'Order Items'

  const formattedShippingFee = `${currency} ${Number(shippingFee || 0).toFixed(2)}`

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; font-weight: 600; color: #1e293b; font-size: 13px;">${item.title}</td>
        <td style="padding: 10px 8px; text-align: center; color: #475569; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 10px 8px; text-align: right; color: #475569; font-size: 13px;">${currency} ${item.price.toFixed(2)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px;">${currency} ${item.lineTotal.toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  await sendEmail({
    to,
    subject: 'New Order Received — Shipping Required | Cartival Mall',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 32px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">CARTIVAL MALL</h1>
          <p style="color: #cbd5e1; margin: 4px 0 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Seller Notification Service</p>
        </div>

        <div style="padding: 32px 32px 24px;">
          <!-- Mandatory Greeting & Opening Copy -->
          <p style="color: #0f172a; font-size: 15px; margin: 0 0 16px; font-weight: 500;">
            Hello,
          </p>

          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            You have received a new order on Cartival Mall.
          </p>

          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            As an independent seller, you are responsible for preparing and shipping your product directly to the customer. Please review the order in your seller dashboard, arrange delivery, and keep the order status updated.
          </p>

          <!-- Shipping fee and your payout -->
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 4px; margin: 0 0 20px;">
            <h4 style="color: #1e3a8a; font-size: 14px; font-weight: 700; margin: 0 0 6px;">
              Shipping fee and your payout
            </h4>
            <p style="color: #334155; font-size: 13px; line-height: 1.55; margin: 0;">
              The shipping fee paid by the customer for this order will be included in your payout calculation, subject to successful payment verification, applicable deductions, refunds, and settlement rules. Your payout breakdown and current payout status will be available in your seller dashboard.
            </p>
          </div>

          <!-- Important delivery reminder -->
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 4px; margin: 0 0 24px;">
            <h4 style="color: #92400e; font-size: 14px; font-weight: 700; margin: 0 0 6px;">
              Important delivery reminder
            </h4>
            <p style="color: #78350f; font-size: 13px; line-height: 1.55; margin: 0;">
              This order requires your attention until the buyer confirms successful delivery. Please update the shipment status when the product has been dispatched. The buyer will be able to confirm receipt through their Cartival Mall account once the order is marked as shipped.
            </p>
          </div>

          <!-- Actual Order Details Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 0 0 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Order reference:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">#${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Product:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${productSummary}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Shipping fee:</td>
                <td style="padding: 6px 0; color: #16a34a; font-weight: 700;">${formattedShippingFee}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Order date:</td>
                <td style="padding: 6px 0; color: #0f172a;">${formattedDate}</td>
              </tr>
            </table>
          </div>

          <!-- Itemized Breakdown Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                <th style="padding: 8px; font-size: 12px; color: #475569; text-transform: uppercase;">Item</th>
                <th style="padding: 8px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: center;">Qty</th>
                <th style="padding: 8px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: right;">Unit Price</th>
                <th style="padding: 8px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Financial Calculation Breakdown -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
              <span>Product Gross Sales:</span>
              <span style="font-weight: 600;">${currency} ${grossTotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a;">
              <span>Customer Shipping Fee (Allocated):</span>
              <span style="font-weight: 700;">+ ${formattedShippingFee}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #dc2626;">
              <span>Cartival Marketplace Commission:</span>
              <span>- ${currency} ${commissionTotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 14px; font-weight: 700; color: #0f172a;">
              <span>Net Seller Payout Calculation:</span>
              <span style="color: #059669; font-size: 15px;">${currency} ${netEarnings.toFixed(2)}</span>
            </div>
          </div>

          <!-- Next Step & Action Button -->
          <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
            <strong>Next step:</strong> Sign in to your Cartival Mall seller dashboard to review the order and arrange shipping.
          </p>

          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${orderUrl}"
              style="display: inline-block; padding: 13px 32px; background: #FF9900; color: #111827; font-weight: 700; border-radius: 6px; text-decoration: none; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Open Seller Dashboard & Ship Order →
            </a>
          </div>

          <!-- Sign-off -->
          <p style="color: #334155; font-size: 14px; margin: 0 0 4px;">
            Thank you for selling with Cartival Mall.
          </p>
          <p style="color: #64748b; font-size: 13px; font-style: italic; margin: 0 0 20px;">
            Cartival Mall Seller Notifications
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartival Mall · Autonomous Multi-Vendor Commerce Platform</p>
        </div>
      </div>`,
    text: `Hello,\n\nYou have received a new order on Cartival Mall.\n\nAs an independent seller, you are responsible for preparing and shipping your product directly to the customer. Please review the order in your seller dashboard, arrange delivery, and keep the order status updated.\n\nShipping fee and your payout\n\nThe shipping fee paid by the customer for this order will be included in your payout calculation, subject to successful payment verification, applicable deductions, refunds, and settlement rules. Your payout breakdown and current payout status will be available in your seller dashboard.\n\nImportant delivery reminder\n\nThis order requires your attention until the buyer confirms successful delivery. Please update the shipment status when the product has been dispatched. The buyer will be able to confirm receipt through their Cartival Mall account once the order is marked as shipped.\n\nOrder reference: #${orderNumber}\n\nProduct: ${productSummary}\n\nShipping fee: ${formattedShippingFee}\n\nOrder date: ${formattedDate}\n\nNext step: Sign in to your Cartival Mall seller dashboard to review the order and arrange shipping.\n\nThank you for selling with Cartival Mall.\n\nCartival Mall Seller Notifications\n\nDashboard URL: ${orderUrl}`,
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
    subject: `Order Confirmed: #${orderNumber} — Cartival Mall`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #131921 0%, #1e293b 100%); padding: 28px 36px; text-align: center;">
          <h1 style="color: #FF9900; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">CARTIVAL MALL</h1>
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
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartival Mall · Trusted Marketplace</p>
        </div>
      </div>`,
    text: `Order Confirmed: #${orderNumber}\n\nHi ${buyerName},\nThank you for shopping at Cartival Mall!\nTotal Paid: ${currency} ${grandTotal.toFixed(2)}\n\nTrack your order in real time: ${orderUrl}`,
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
          <h1 style="color: #FF9900; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">CARTIVAL MALL</h1>
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
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartival Mall · Logistics & Fulfillment Network</p>
        </div>
      </div>`,
    text: `Order #${orderNumber} Update: ${statusDisplay}\n\nHi ${buyerName},\nYour order has been updated to: ${statusDisplay}.\n${carrier ? `Carrier: ${carrier}\n` : ''}${trackingNumber ? `Tracking Number: ${trackingNumber}\n` : ''}\nView in your account: ${orderUrl}`,
  })
}

// ─── Payout Notification: Admin New Withdrawal Request Alert ──────────────────
export interface AdminNewWithdrawalEmailParams {
  to: string
  sellerStoreName: string
  sellerEmail: string
  withdrawalNumber: string
  amount: number
  currency: string
  bankName: string
  accountNumber: string
  accountName: string
  requestedAt?: Date
}

export const sendAdminNewWithdrawalEmail = async (
  params: AdminNewWithdrawalEmailParams,
): Promise<void> => {
  const adminUrl = `${env.CLIENT_URL}/admin/withdrawals`
  const formattedAmount = `${params.currency} ${params.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const dateStr = (params.requestedAt || new Date()).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  await sendEmail({
    to: params.to,
    subject: `[ACTION REQUIRED] New Seller Withdrawal Request: ${formattedAmount} (${params.withdrawalNumber})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: #131921; padding: 24px 32px; border-bottom: 3px solid #FF9900;">
          <h1 style="color: #FF9900; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Cartival Mall</h1>
          <div style="color: #9ca3af; font-size: 13px; margin-top: 4px;">Finance &amp; Marketplace Payout Alerts</div>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <!-- Urgent Alert Banner -->
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
            <div style="color: #92400e; font-size: 15px; font-weight: 700; margin-bottom: 4px;">
              ⚡ Action Required: Seller Withdrawal Awaiting Manual Bank Transfer
            </div>
            <div style="color: #78350f; font-size: 13px; line-height: 1.5;">
              A seller has requested a payout. Please transfer the exact amount below from your business bank account, then record the transaction reference in the Admin Panel to mark it fulfilled.
            </div>
          </div>

          <h2 style="color: #111827; margin: 0 0 16px; font-size: 18px;">Withdrawal Details</h2>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Withdrawal ID:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 700; font-family: monospace;">${params.withdrawalNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Payout Amount:</td>
                <td style="padding: 8px 0; color: #16a34a; font-weight: 800; font-size: 18px;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Seller Store:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${params.sellerStoreName} (${params.sellerEmail})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Requested Date:</td>
                <td style="padding: 8px 0; color: #374151;">${dateStr}</td>
              </tr>
            </table>

            <hr style="border: none; border-top: 1px dashed #d1d5db; margin: 16px 0;" />

            <div style="font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
              Beneficiary Bank Account
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; width: 40%;">Bank Name:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 700;">${params.bankName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Account Number:</td>
                <td style="padding: 6px 0; color: #1e40af; font-weight: 800; font-size: 20px; font-family: monospace; letter-spacing: 1.5px;">
                  ${params.accountNumber}
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Account Name:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 600;">${params.accountName}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="${adminUrl}"
               style="display: inline-block; padding: 14px 32px; background: #FF9900; color: #111827;
                      font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Open Payouts Dashboard to Fulfill →
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-top: 24px; text-align: center;">
            This email was sent to notify you of an incoming seller payout request on Cartival Mall.<br/>
            You can change this notification email address anytime in the <strong>Admin Panel &gt; Settings &gt; Payout Notification Settings</strong>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Cartival Mall · Automated Marketplace Finance Notification</p>
        </div>
      </div>`,
    text: `[ACTION REQUIRED] New Seller Withdrawal Request: ${formattedAmount}\n\nWithdrawal ID: ${params.withdrawalNumber}\nSeller: ${params.sellerStoreName} (${params.sellerEmail})\nAmount: ${formattedAmount}\n\nBeneficiary Bank: ${params.bankName}\nAccount Number: ${params.accountNumber}\nAccount Name: ${params.accountName}\n\nPlease transfer ${formattedAmount} to the account above, then visit the Admin Dashboard to mark it fulfilled:\n${adminUrl}`,
  })
}
