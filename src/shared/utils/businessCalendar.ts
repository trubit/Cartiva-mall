/**
 * Business Calendar & Withdrawal Completion Policy Utility
 *
 * Mandate:
 * 1. Withdrawal processing target: up to 4 working days.
 * 2. Working days exclude Saturdays, Sundays, and official public holidays.
 * 3. Calculation uses the configured business timezone (Default: Africa/Lagos, GMT+1).
 * 4. Stored timestamps are standard UTC Date objects.
 * 5. Rule:
 *    A withdrawal submitted on calendar date D (in the business timezone) begins processing,
 *    and each subsequent business day counts as 1 working day. The 4th working day represents
 *    the expected completion target date.
 */

export const DEFAULT_BUSINESS_TIMEZONE = 'Africa/Lagos'
export const DEFAULT_WITHDRAWAL_TARGET_WORKING_DAYS = 7

/**
 * Standard public holidays registry (YYYY-MM-DD format in business timezone).
 * Can be augmented dynamically via environment variable or custom config.
 */
export const DEFAULT_PUBLIC_HOLIDAYS_SET = new Set<string>([
  // 2025
  '2025-01-01', // New Year's Day
  '2025-03-31', // Eid al-Fitr (approx)
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-01', // Workers' Day
  '2025-05-27', // Children's Day
  '2025-06-07', // Eid al-Adha
  '2025-06-12', // Democracy Day
  '2025-10-01', // Independence Day
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day

  // 2026
  '2026-01-01', // New Year's Day
  '2026-03-20', // Eid al-Fitr (approx)
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-01', // Workers' Day
  '2026-05-27', // Children's Day
  '2026-05-28', // Eid al-Kabir
  '2026-06-12', // Democracy Day
  '2026-10-01', // Independence Day
  '2026-12-25', // Christmas Day
  '2026-12-26', // Boxing Day

  // 2027
  '2027-01-01', // New Year's Day
  '2027-03-26', // Good Friday
  '2027-03-29', // Easter Monday
  '2027-05-01', // Workers' Day
  '2027-06-12', // Democracy Day
  '2027-10-01', // Independence Day
  '2027-12-25', // Christmas Day
  '2027-12-26', // Boxing Day
])

export interface BusinessCalendarConfig {
  timezone?: string
  holidays?: string[] | Set<string>
  workingDaysTarget?: number
}

/**
 * Extracts the YYYY-MM-DD representation of a Date in the given timezone.
 */
export function getDateInTimezone(
  date: Date,
  timezone: string = DEFAULT_BUSINESS_TIMEZONE,
): {
  year: number
  month: number
  day: number
  dateString: string
  dayOfWeek: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })

  const parts = formatter.formatToParts(date)
  let year = 1970
  let month = 1
  let day = 1
  let weekdayStr = 'Sun'

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10)
    if (part.type === 'month') month = parseInt(part.value, 10)
    if (part.type === 'day') day = parseInt(part.value, 10)
    if (part.type === 'weekday') weekdayStr = part.value
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  const dayOfWeek = weekdayMap[weekdayStr] ?? 0
  const monthPadded = String(month).padStart(2, '0')
  const dayPadded = String(day).padStart(2, '0')
  const dateString = `${year}-${monthPadded}-${dayPadded}`

  return { year, month, day, dateString, dayOfWeek }
}

/**
 * Determines whether a specific calendar date is a non-working day (Weekend or Public Holiday).
 */
export function isNonWorkingDay(date: Date, config?: BusinessCalendarConfig): boolean {
  const tz = config?.timezone || DEFAULT_BUSINESS_TIMEZONE
  const holidays = config?.holidays
    ? Array.isArray(config.holidays)
      ? new Set(config.holidays)
      : config.holidays
    : DEFAULT_PUBLIC_HOLIDAYS_SET

  const { dayOfWeek, dateString } = getDateInTimezone(date, tz)

  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) return true

  // Check public holiday calendar
  if (holidays.has(dateString)) return true

  return false
}

/**
 * Calculates the expected completion date for a withdrawal.
 *
 * @param submissionDate UTC Date when the withdrawal was recorded
 * @param config Optional calendar configuration
 * @returns Expected completion Date in UTC set to end of business on the target working day
 */
export function calculateExpectedCompletionDate(
  submissionDate: Date,
  config?: BusinessCalendarConfig,
): Date {
  const tz = config?.timezone || DEFAULT_BUSINESS_TIMEZONE
  const targetDays = config?.workingDaysTarget ?? DEFAULT_WITHDRAWAL_TARGET_WORKING_DAYS
  const holidays = config?.holidays
    ? Array.isArray(config.holidays)
      ? new Set(config.holidays)
      : config.holidays
    : DEFAULT_PUBLIC_HOLIDAYS_SET

  // Start scanning from the submission date in the business timezone
  const baseTzInfo = getDateInTimezone(submissionDate, tz)

  // Create cursor date at noon UTC on submission day to safely avoid DST issues
  let cursor = new Date(Date.UTC(baseTzInfo.year, baseTzInfo.month - 1, baseTzInfo.day, 12, 0, 0))

  let workingDaysCounted = 0
  const maxIterations = 40 // Safety net

  while (workingDaysCounted < targetDays && maxIterations > 0) {
    // Advance 1 day
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)

    const tzInfo = getDateInTimezone(cursor, tz)
    const isWeekend = tzInfo.dayOfWeek === 0 || tzInfo.dayOfWeek === 6
    const isHoliday = holidays.has(tzInfo.dateString)

    if (!isWeekend && !isHoliday) {
      workingDaysCounted++
    }
  }

  // Set time to end of business on the target date (17:00 in business timezone)
  // Africa/Lagos is UTC+1 (no DST), so 17:00 Lagos = 16:00 UTC
  const finalTzInfo = getDateInTimezone(cursor, tz)
  const result = new Date(
    Date.UTC(finalTzInfo.year, finalTzInfo.month - 1, finalTzInfo.day, 16, 0, 0, 0),
  )

  return result
}

/**
 * Returns user-friendly status details and overdue flag for a withdrawal.
 */
export function getWithdrawalTimelineStatus(
  status: string,
  requestedAt: Date | string,
  expectedCompletionDate?: Date | string | null,
  currentDate: Date = new Date(),
): {
  isOverdue: boolean
  isCompleted: boolean
  isTerminal: boolean
  displayStatus: string
  formattedExpectedDate: string
} {
  const terminalStatuses = ['completed', 'failed', 'cancelled', 'reversed', 'rejected']
  const isTerminal = terminalStatuses.includes(status)
  const isCompleted = status === 'completed'

  let expDate: Date | null = null
  if (expectedCompletionDate) {
    expDate = new Date(expectedCompletionDate)
  } else if (requestedAt) {
    expDate = calculateExpectedCompletionDate(new Date(requestedAt))
  }

  const isOverdue = !isTerminal && expDate !== null && currentDate.getTime() > expDate.getTime()

  let displayStatus: string
  switch (status) {
    case 'completed':
      displayStatus = 'Completed'
      break
    case 'processing':
      displayStatus = 'Processing'
      break
    case 'pending_approval':
      displayStatus = 'Pending Approval'
      break
    case 'pending':
      displayStatus = 'Pending'
      break
    case 'rejected':
      displayStatus = 'Rejected'
      break
    case 'failed':
      displayStatus = 'Failed'
      break
    case 'cancelled':
      displayStatus = 'Cancelled'
      break
    case 'reversed':
      displayStatus = 'Reversed'
      break
    default:
      displayStatus = status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formattedExpectedDate = expDate
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_BUSINESS_TIMEZONE,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(expDate)
    : 'Within 7 working days'

  return {
    isOverdue,
    isCompleted,
    isTerminal,
    displayStatus,
    formattedExpectedDate,
  }
}

export const WITHDRAWAL_POLICY_TEXT =
  'Withdrawal Request Submitted Successfully. Your withdrawal is being processed and may take up to 7 working days to complete. Working days exclude weekends and applicable public holidays. You can track the status of your withdrawal in your account.'

export const WITHDRAWAL_POLICY_SUMMARY =
  'Withdrawal processing takes up to 7 working days (excluding weekends and public holidays).'

export interface FriendlyTimelineItem {
  stageTitle: string
  friendlyNote: string
  badgeText: string
  badgeColor: string
  badgeBg: string
  iconType: 'submitted' | 'review' | 'processing' | 'completed' | 'failed' | 'reversed'
}

/**
 * Transforms raw internal audit logs into professional, friendly, and understandable messages.
 * Prevents internal payment gateway tier error dumps or technical jargon from confusing users.
 */
export function formatFriendlyTimelineEntry(
  status: string,
  rawNote?: string,
): FriendlyTimelineItem {
  const note = (rawNote || '').trim()
  const lowerNote = note.toLowerCase()
  const lowerStatus = (status || '').toLowerCase()

  // 1. Withdrawal request submitted
  if (
    lowerNote.includes('withdrawal request submitted') ||
    lowerNote.includes('requested manual payout')
  ) {
    let maskedBankInfo = ''
    const toMatch = note.match(/to\s+(.+?)(?:\.|\s*$)/i)
    if (toMatch) {
      const targetStr = toMatch[1].trim()
      // Extract trailing account number in parentheses: e.g. "(7037643440)" or "(•••• 3440)"
      const acctMatch = targetStr.match(/\((?:[•*]{2,}\s*)?([0-9]{4,})\)\s*$/)
      if (acctMatch) {
        const acct = acctMatch[1]
        const bankName = targetStr.replace(/\s*\((?:[•*]{2,}\s*)?[0-9]{4,}\)\s*$/, '').trim()
        maskedBankInfo = ` Destination: ${bankName} (•••• ${acct.slice(-4)}).`
      } else {
        maskedBankInfo = ` Destination: ${targetStr}.`
      }
    }

    return {
      stageTitle: 'Withdrawal Request Received',
      friendlyNote: `Your withdrawal request was successfully submitted.${maskedBankInfo} Funds have been securely reserved from your wallet and our payment operations team is reviewing the transfer.`,
      badgeText: 'Submitted',
      badgeColor: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.12)',
      iconType: 'submitted',
    }
  }

  // 2. Gateway starter business / tier / manual routing
  if (
    lowerNote.includes('starter business') ||
    lowerNote.includes('third party payouts') ||
    lowerNote.includes('automated payout unavailable') ||
    lowerNote.includes('recipient code unavailable') ||
    lowerNote.includes('automated transfer not configured') ||
    lowerNote.includes('routed to admin')
  ) {
    return {
      stageTitle: 'Standard Verification & Routing',
      friendlyNote:
        'Security & Compliance Review: Your payout has been routed through our verified banking desk for manual transfer authorization and direct bank clearing.',
      badgeText: 'In Review',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      iconType: 'review',
    }
  }

  // 3. System reconciliation or queued for admin review
  if (
    lowerNote.includes('system automated reconciliation') ||
    lowerNote.includes('queued for admin review') ||
    lowerNote.includes('pending_approval for manual bank fulfillment')
  ) {
    return {
      stageTitle: 'Scheduled for Bank Transfer',
      friendlyNote:
        'Verification Complete: Your payout has been confirmed by our financial compliance system and scheduled for direct bank disbursement.',
      badgeText: 'Verified',
      badgeColor: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.12)',
      iconType: 'processing',
    }
  }

  // 4. Completed / manual fulfillment / webhook success
  if (
    lowerStatus === 'completed' ||
    lowerNote.includes('manual bank payout fulfilled') ||
    lowerNote.includes('transfer verified and completed') ||
    lowerNote.includes('paystack transfer successful') ||
    lowerNote.includes('transfer completed synchronously')
  ) {
    let refText = ''
    const refMatch = note.match(/(?:Bank Ref|Ref|Reference|code):\s*([a-zA-Z0-9_-]+)/i)
    if (refMatch && refMatch[1]) {
      refText = ` Bank Reference: ${refMatch[1]}.`
    }

    return {
      stageTitle: 'Funds Disbursed to Bank',
      friendlyNote: `Success! The funds have been transferred to your destination bank account.${refText} Please check your bank account or statement.`,
      badgeText: 'Completed',
      badgeColor: '#22c55e',
      badgeBg: 'rgba(34, 197, 94, 0.12)',
      iconType: 'completed',
    }
  }

  // 5. Rejected by admin
  if (lowerStatus === 'rejected' || lowerNote.includes('withdrawal rejected')) {
    let reasonText = ''
    const reasonMatch = note.match(/Reason:\s*(.+)$/i)
    if (reasonMatch && reasonMatch[1]) {
      reasonText = ` Note: ${reasonMatch[1].trim()}.`
    }

    return {
      stageTitle: 'Withdrawal Request Declined',
      friendlyNote: `This withdrawal request could not be approved.${reasonText} All reserved funds have been restored immediately to your available balance.`,
      badgeText: 'Declined',
      badgeColor: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.12)',
      iconType: 'failed',
    }
  }

  // 6. Transfer failed / reversed
  if (
    lowerStatus === 'failed' ||
    lowerStatus === 'reversed' ||
    lowerNote.includes('transfer.failed') ||
    lowerNote.includes('transfer.reversed') ||
    lowerNote.includes('transfer declined')
  ) {
    let reasonText = ''
    const reasonMatch = note.match(/Reason:\s*(.+)$/i)
    if (reasonMatch && reasonMatch[1]) {
      reasonText = ` Reason: ${reasonMatch[1].trim()}.`
    }

    return {
      stageTitle: 'Transfer Returned & Funds Restored',
      friendlyNote: `The banking network was unable to complete the transfer.${reasonText} All reserved funds have been safely returned to your available balance. Please check your bank details or contact support.`,
      badgeText: lowerStatus === 'reversed' ? 'Reversed' : 'Failed',
      badgeColor: '#f87171',
      badgeBg: 'rgba(248, 113, 113, 0.12)',
      iconType: 'reversed',
    }
  }

  // 7. General fallback
  switch (lowerStatus) {
    case 'processing':
      return {
        stageTitle: 'Bank Processing in Progress',
        friendlyNote:
          note ||
          'Your withdrawal is being processed through the banking network. This typically takes up to 7 working days.',
        badgeText: 'Processing',
        badgeColor: '#38bdf8',
        badgeBg: 'rgba(56, 189, 248, 0.12)',
        iconType: 'processing',
      }
    case 'pending_approval':
      return {
        stageTitle: 'Review in Progress',
        friendlyNote:
          note || 'Your payout request is currently undergoing review by our operations team.',
        badgeText: 'Pending Approval',
        badgeColor: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        iconType: 'review',
      }
    default:
      return {
        stageTitle: status
          ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
          : 'Status Update',
        friendlyNote: note || 'Status update recorded for this withdrawal.',
        badgeText: status ? status.toUpperCase().replace(/_/g, ' ') : 'UPDATE',
        badgeColor: '#94a3b8',
        badgeBg: 'rgba(148, 163, 184, 0.12)',
        iconType: 'processing',
      }
  }
}
