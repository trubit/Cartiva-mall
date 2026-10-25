import { describe, it, expect } from 'vitest'
import {
  calculateExpectedCompletionDate,
  getDateInTimezone,
  isNonWorkingDay,
  getWithdrawalTimelineStatus,
  formatFriendlyTimelineEntry,
  DEFAULT_BUSINESS_TIMEZONE,
  DEFAULT_WITHDRAWAL_TARGET_WORKING_DAYS,
  WITHDRAWAL_POLICY_TEXT,
  WITHDRAWAL_POLICY_SUMMARY,
} from '../../../../src/shared/utils/businessCalendar.js'

describe('Business Calendar & 7-Working-Day Withdrawal Policy', () => {
  it('has valid constants and policy text for 7 working days', () => {
    expect(DEFAULT_BUSINESS_TIMEZONE).toBe('Africa/Lagos')
    expect(DEFAULT_WITHDRAWAL_TARGET_WORKING_DAYS).toBe(7)
    expect(WITHDRAWAL_POLICY_TEXT).toContain('up to 7 working days to complete')
    expect(WITHDRAWAL_POLICY_TEXT).toContain('exclude weekends and applicable public holidays')
    expect(WITHDRAWAL_POLICY_SUMMARY).toContain('takes up to 7 working days')
  })

  describe('getDateInTimezone', () => {
    it('accurately parses dates in the configured business timezone', () => {
      // 2026-05-04 10:00:00 UTC is 11:00:00 in Africa/Lagos (UTC+1)
      const date = new Date('2026-05-04T10:00:00.000Z')
      const info = getDateInTimezone(date, 'Africa/Lagos')

      expect(info.year).toBe(2026)
      expect(info.month).toBe(5)
      expect(info.day).toBe(4)
      expect(info.dateString).toBe('2026-05-04')
      expect(info.dayOfWeek).toBe(1) // Monday
    })

    it('correctly shifts day when UTC is late evening but Lagos is past midnight', () => {
      // 2026-05-04 23:30:00 UTC is 2026-05-05 00:30:00 in Lagos (UTC+1)
      const date = new Date('2026-05-04T23:30:00.000Z')
      const info = getDateInTimezone(date, 'Africa/Lagos')

      expect(info.year).toBe(2026)
      expect(info.month).toBe(5)
      expect(info.day).toBe(5)
      expect(info.dateString).toBe('2026-05-05')
      expect(info.dayOfWeek).toBe(2) // Tuesday
    })
  })

  describe('isNonWorkingDay', () => {
    it('identifies Saturday and Sunday as non-working days', () => {
      const saturday = new Date('2026-05-09T12:00:00.000Z') // Sat
      const sunday = new Date('2026-05-10T12:00:00.000Z') // Sun
      const monday = new Date('2026-05-11T12:00:00.000Z') // Mon

      expect(isNonWorkingDay(saturday)).toBe(true)
      expect(isNonWorkingDay(sunday)).toBe(true)
      expect(isNonWorkingDay(monday)).toBe(false)
    })

    it('identifies public holidays as non-working days', () => {
      const workersDay = new Date('2026-05-01T12:00:00.000Z') // May 1st holiday
      const normalDay = new Date('2026-05-04T12:00:00.000Z') // May 4th regular working day

      expect(isNonWorkingDay(workersDay)).toBe(true)
      expect(isNonWorkingDay(normalDay)).toBe(false)
    })
  })

  describe('calculateExpectedCompletionDate (7 Working Days)', () => {
    it('calculates 7 working days for Monday submission (Mon -> Wed following week)', () => {
      // Monday 2026-05-04
      // Days counted: Tue May 5 (1), Wed May 6 (2), Thu May 7 (3), Fri May 8 (4)
      // Sat/Sun skipped (May 9, 10)
      // Mon May 11 (5), Tue May 12 (6), Wed May 13 (7)
      const submission = new Date('2026-05-04T09:00:00.000Z')
      const completion = calculateExpectedCompletionDate(submission)

      const info = getDateInTimezone(completion)
      expect(info.dateString).toBe('2026-05-13')
      expect(info.dayOfWeek).toBe(3) // Wednesday
      expect(completion.toISOString()).toBe('2026-05-13T16:00:00.000Z')
    })

    it('skips weekends for Wednesday submission (Wed -> Fri following week)', () => {
      // Wednesday 2026-05-06
      // Day 1: Thu May 7, Day 2: Fri May 8
      // Sat May 9, Sun May 10 skipped
      // Day 3: Mon May 11, Day 4: Tue May 12, Day 5: Wed May 13, Day 6: Thu May 14, Day 7: Fri May 15
      const submission = new Date('2026-05-06T14:30:00.000Z')
      const completion = calculateExpectedCompletionDate(submission)

      const info = getDateInTimezone(completion)
      expect(info.dateString).toBe('2026-05-15')
      expect(info.dayOfWeek).toBe(5) // Friday
      expect(completion.toISOString()).toBe('2026-05-15T16:00:00.000Z')
    })

    it('skips weekends for Friday submission (Fri -> Tue 2 weeks later)', () => {
      // Friday 2026-05-08
      // Sat May 9, Sun May 10 skipped
      // Mon May 11 (1), Tue May 12 (2), Wed May 13 (3), Thu May 14 (4), Fri May 15 (5)
      // Sat May 16, Sun May 17 skipped
      // Mon May 18 (6), Tue May 19 (7)
      const submission = new Date('2026-05-08T11:00:00.000Z')
      const completion = calculateExpectedCompletionDate(submission)

      const info = getDateInTimezone(completion)
      expect(info.dateString).toBe('2026-05-19')
      expect(info.dayOfWeek).toBe(2) // Tuesday
      expect(completion.toISOString()).toBe('2026-05-19T16:00:00.000Z')
    })

    it('handles weekend submissions safely (Sat -> Tue 2 weeks later)', () => {
      // Saturday 2026-05-09
      // Sun May 10 skipped
      // Mon May 11 (1), Tue May 12 (2), Wed May 13 (3), Thu May 14 (4), Fri May 15 (5)
      // Sat May 16, Sun May 17 skipped
      // Mon May 18 (6), Tue May 19 (7)
      const submission = new Date('2026-05-09T15:00:00.000Z')
      const completion = calculateExpectedCompletionDate(submission)

      const info = getDateInTimezone(completion)
      expect(info.dateString).toBe('2026-05-19')
      expect(info.dayOfWeek).toBe(2) // Tuesday
      expect(completion.toISOString()).toBe('2026-05-19T16:00:00.000Z')
    })

    it('skips public holidays and Easter weekend correctly for 7 working days', () => {
      // 2026 Easter:
      // Good Friday is 2026-04-03 (Holiday)
      // Easter Monday is 2026-04-06 (Holiday)
      // Submission on Wednesday 2026-04-01:
      // Day 1: Thu 2026-04-02
      // Good Friday 2026-04-03 skipped
      // Sat 2026-04-04 skipped, Sun 2026-04-05 skipped
      // Easter Monday 2026-04-06 skipped
      // Day 2: Tue 2026-04-07
      // Day 3: Wed 2026-04-08
      // Day 4: Thu 2026-04-09
      // Day 5: Fri 2026-04-10
      // Sat 2026-04-11, Sun 2026-04-12 skipped
      // Day 6: Mon 2026-04-13
      // Day 7: Tue 2026-04-14
      const submission = new Date('2026-04-01T10:00:00.000Z')
      const completion = calculateExpectedCompletionDate(submission)

      const info = getDateInTimezone(completion)
      expect(info.dateString).toBe('2026-04-14')
      expect(info.dayOfWeek).toBe(2) // Tuesday
      expect(completion.toISOString()).toBe('2026-04-14T16:00:00.000Z')
    })

    it('handles year-end crossover and New Year holiday correctly', () => {
      // Submission on Monday Dec 29, 2025:
      // Day 1: Tue Dec 30, 2025
      // Day 2: Wed Dec 31, 2025
      // Thu Jan 01, 2026 (New Year's Day - Holiday) skipped
      // Day 3: Fri Jan 02, 2026
      // Sat Jan 03, Sun Jan 04 skipped
      // Day 4: Mon Jan 05, 2026
      // Day 5: Tue Jan 06, 2026
      // Day 6: Wed Jan 07, 2026
      // Day 7: Thu Jan 08, 2026
      const submission = new Date('2025-12-29T08:00:00.000Z')
      const completion = calculateExpectedCompletionDate(submission)

      const info = getDateInTimezone(completion)
      expect(info.dateString).toBe('2026-01-08')
      expect(info.dayOfWeek).toBe(4) // Thursday
      expect(completion.toISOString()).toBe('2026-01-08T16:00:00.000Z')
    })
  })

  describe('getWithdrawalTimelineStatus', () => {
    it('detects on-track processing withdrawal and formats 7-working-day target', () => {
      const requestedAt = new Date('2026-05-04T10:00:00.000Z') // Expected: 2026-05-13 16:00 UTC
      const expectedDate = calculateExpectedCompletionDate(requestedAt)
      const currentDate = new Date('2026-05-08T10:00:00.000Z') // Fri (before target)

      const status = getWithdrawalTimelineStatus(
        'processing',
        requestedAt,
        expectedDate,
        currentDate,
      )

      expect(status.isOverdue).toBe(false)
      expect(status.isCompleted).toBe(false)
      expect(status.isTerminal).toBe(false)
      expect(status.displayStatus).toBe('Processing')
      expect(status.formattedExpectedDate).toContain('May 13, 2026')
    })
  })

  describe('formatFriendlyTimelineEntry (Professional & Friendly Write-up)', () => {
    it('converts raw starter business gateway errors into friendly security review note', () => {
      const rawNote =
        'Automated payout unavailable on gateway tier (You cannot initiate third party payouts as a starter business). Routed to Admin for manual bank fulfillment.'
      const formatted = formatFriendlyTimelineEntry('pending_approval', rawNote)

      expect(formatted.stageTitle).toBe('Standard Verification & Routing')
      expect(formatted.badgeText).toBe('In Review')
      expect(formatted.friendlyNote).toContain('Security & Compliance Review')
      expect(formatted.friendlyNote).not.toContain('starter business')
      expect(formatted.friendlyNote).not.toContain('gateway tier')
    })

    it('converts raw automated reconciliation log into friendly scheduling note', () => {
      const rawNote =
        'System automated reconciliation: transitioned from processing to pending_approval for manual bank fulfillment.'
      const formatted = formatFriendlyTimelineEntry('pending_approval', rawNote)

      expect(formatted.stageTitle).toBe('Scheduled for Bank Transfer')
      expect(formatted.badgeText).toBe('Verified')
      expect(formatted.friendlyNote).toContain('Verification Complete')
      expect(formatted.friendlyNote).toContain('direct bank disbursement')
    })

    it('converts manual fulfillment log into clean success note with bank reference', () => {
      const rawNote = 'Manual bank payout fulfilled by admin. Bank Ref: 26100101010075171721241'
      const formatted = formatFriendlyTimelineEntry('completed', rawNote)

      expect(formatted.stageTitle).toBe('Funds Disbursed to Bank')
      expect(formatted.badgeText).toBe('Completed')
      expect(formatted.friendlyNote).toContain('Success! The funds have been transferred')
      expect(formatted.friendlyNote).toContain('26100101010075171721241')
    })

    it('masks raw bank account numbers in withdrawal submission notes', () => {
      const rawNote =
        'Withdrawal request submitted for NGN 33093.46 to OPay Digital Services Limited (OPay) (7037643440)'
      const formatted = formatFriendlyTimelineEntry('processing', rawNote)

      expect(formatted.stageTitle).toBe('Withdrawal Request Received')
      expect(formatted.badgeText).toBe('Submitted')
      expect(formatted.friendlyNote).toContain('•••• 3440')
      expect(formatted.friendlyNote).not.toContain('7037643440')
    })

    it('formats admin rejection notes gracefully with restored balance reassurance', () => {
      const rawNote =
        'Withdrawal rejected by admin. Reason: Account name does not match government ID'
      const formatted = formatFriendlyTimelineEntry('rejected', rawNote)

      expect(formatted.stageTitle).toBe('Withdrawal Request Declined')
      expect(formatted.badgeText).toBe('Declined')
      expect(formatted.friendlyNote).toContain('Account name does not match government ID')
      expect(formatted.friendlyNote).toContain('restored immediately to your available balance')
    })
  })
})
