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

// ─── Brevo REST API (no IP restriction, works from any machine) ────────────────
const sendViaBrevoAPI = async (
  options: MailOptions & { from: string; fromName: string },
): Promise<void> => {
  await callBrevo(async () => {
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
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(
        `Brevo API error ${res.status}: ${(body as { message?: string }).message ?? res.statusText}`,
      )
    }
  })
}

// ─── Ethereal fallback (dev preview, no real delivery) ────────────────────────
let _ethereal: nodemailer.Transporter | null = null

const sendViaEthereal = async (options: MailOptions): Promise<void> => {
  if (!_ethereal) {
    const acc = await nodemailer.createTestAccount()
    logger.warn(
      'No BREVO_API_KEY set — using Ethereal preview (emails NOT delivered to real inboxes)',
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

// ─── Parse EMAIL_FROM  "Name <email@example.com>" ────────────────────────────
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
    logger.warn('Email BREVO_API_KEY not set — emails will show as Ethereal preview URLs in logs')
  }
}

// ─── Core send ─────────────────────────────────────────────────────────────────
export const sendEmail = async (options: MailOptions): Promise<void> => {
  if (env.BREVO_API_KEY) {
    const { name, email } = parseFrom(env.EMAIL_FROM || env.EMAIL_USER || 'noreply@cartiva.com')
    await sendViaBrevoAPI({ ...options, from: email, fromName: name })
    logger.info(`Email sent  to="${options.to}"  subject="${options.subject}"`)
  } else {
    await sendViaEthereal(options)
  }
}

// ─── Verification email ────────────────────────────────────────────────────────
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

// ─── Password reset email ──────────────────────────────────────────────────────
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
