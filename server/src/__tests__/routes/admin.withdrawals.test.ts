import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import adminRouter from '../../routes/admin.routes.js'
import { errorHandler } from '../../middlewares/error.middleware.js'
import {
  SellerWithdrawal,
  SellerLedger,
  type ISellerWithdrawalDocument,
} from '../../modules/seller/sellerPayout.model.js'
import { AuditLog } from '../../modules/admin/audit-log.model.js'
import * as adminService from '../../modules/admin/admin.service.js'
import type { TokenPayload } from '../../../../src/shared/types/auth.types.js'

let currentMockUser: Partial<TokenPayload> | null = null

vi.mock('../../middlewares/auth.middleware.js', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as any).user = currentMockUser
    next()
  },
  authorize:
    (..._roles: string[]) =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
  hasPermission:
    (..._perms: string[]) =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}))

vi.mock('../../middlewares/rateLimiter.middleware.js', () => ({
  dashboardLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  adminLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

const app = express()
app.use(express.json())
app.use('/api/v1/admin', adminRouter)
app.use(errorHandler)

describe('Admin Manual Withdrawal Fulfillment & Actions', () => {
  const adminObjectId = new mongoose.Types.ObjectId()
  const sellerObjectId = new mongoose.Types.ObjectId()

  beforeEach(async () => {
    vi.clearAllMocks()
    await Promise.all([
      SellerWithdrawal.deleteMany({}),
      SellerLedger.deleteMany({}),
      AuditLog.deleteMany({}),
    ])

    // Standard TokenPayload emitted by auth middleware (has userId, NOT _id or id)
    currentMockUser = {
      userId: adminObjectId.toString(),
      email: 'admin@cartiva.test',
      role: 'admin',
    }
  })

  async function createTestWithdrawal(overrides?: Partial<ISellerWithdrawalDocument>) {
    return SellerWithdrawal.create({
      withdrawalNumber: `WD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      sellerId: sellerObjectId,
      amount: 25000,
      fee: 0,
      netAmount: 25000,
      currency: 'NGN',
      status: 'pending_approval',
      payoutMethod: 'manual',
      payoutAccount: {
        bankName: 'First Bank of Nigeria',
        bankCode: '011',
        accountNumber: '0123456789',
        accountName: 'Test Seller Store',
      },
      auditLog: [
        {
          status: 'pending_approval',
          note: 'Requested manual payout',
          timestamp: new Date(),
        },
      ],
      ...overrides,
    })
  }

  // ─── 1. Valid Fulfillment ──────────────────────────────────────────────────
  describe('POST /api/v1/admin/withdrawals/:id/fulfill-manual - Valid Fulfillment', () => {
    it('fulfills manual withdrawal successfully with 24-character hex ObjectId', async () => {
      const withdrawal = await createTestWithdrawal()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-2026-999',
          note: 'Transferred via corporate banking portal',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('completed')
      expect(res.body.data.payoutMethod).toBe('manual')
      expect(res.body.data.manualPayoutReference).toBe('BNK-REF-2026-999')
      expect(res.body.data.fulfilledBy).toBe(adminObjectId.toString())

      // Verify DB record was updated
      const updated = await SellerWithdrawal.findById(withdrawal._id)
      expect(updated?.status).toBe('completed')
      expect(updated?.fulfilledBy?.toString()).toBe(adminObjectId.toString())
      expect(updated?.manualPayoutReference).toBe('BNK-REF-2026-999')
      expect(updated?.completedAt).toBeDefined()

      // Verify financial ledger entry
      const ledgerEntry = await SellerLedger.findOne({
        referenceId: withdrawal.withdrawalNumber,
        type: 'WITHDRAWAL_SETTLED',
      })
      expect(ledgerEntry).toBeDefined()
      expect(ledgerEntry?.sellerId.toString()).toBe(sellerObjectId.toString())
      expect(ledgerEntry?.amount).toBe(-25000)

      // Verify audit log
      const audit = await AuditLog.findOne({
        targetId: withdrawal._id.toString(),
        action: 'withdrawal:manual_fulfilled',
      })
      expect(audit).toBeDefined()
      expect(audit?.adminId.toString()).toBe(adminObjectId.toString())
    })

    it('fulfills manual withdrawal successfully using withdrawalNumber', async () => {
      const withdrawal = await createTestWithdrawal()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal.withdrawalNumber}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-BY-WD-NUM',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('completed')

      const updated = await SellerWithdrawal.findById(withdrawal._id)
      expect(updated?.status).toBe('completed')
      expect(updated?.manualPayoutReference).toBe('BNK-REF-BY-WD-NUM')
    })
  })

  // ─── 2. Malformed IDs ──────────────────────────────────────────────────────
  describe('Malformed ID Handling (Client error 400 instead of HTTP 500)', () => {
    it('returns HTTP 400 for malformed withdrawal ID (not ObjectId and not WD-... format)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/withdrawals/malformed-id-123/fulfill-manual')
        .send({
          manualReference: 'BNK-REF-123',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Invalid withdrawal ID format')
    })

    it('returns HTTP 400 for short non-hex string as withdrawal ID', async () => {
      const res = await request(app).post('/api/v1/admin/withdrawals/123/fulfill-manual').send({
        manualReference: 'BNK-REF-123',
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Invalid withdrawal ID format')
    })

    it('returns HTTP 400 client error when admin ID is missing from auth context', async () => {
      const withdrawal = await createTestWithdrawal()
      currentMockUser = null

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-123',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Invalid or missing admin ID')
    })

    it('returns HTTP 400 client error when admin ID is malformed/invalid ObjectId', async () => {
      const withdrawal = await createTestWithdrawal()
      currentMockUser = {
        userId: 'not-a-valid-object-id',
        email: 'badadmin@cartiva.test',
        role: 'admin',
      }

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-123',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Invalid or missing admin ID')
    })
  })

  // ─── 3. Missing Records ────────────────────────────────────────────────────
  describe('Missing Records Handling (HTTP 404)', () => {
    it('returns HTTP 404 when valid 24-char ObjectId does not match any withdrawal', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${nonExistentId}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-123',
        })

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Withdrawal record not found')
    })

    it('returns HTTP 404 when valid withdrawalNumber format does not match any record', async () => {
      const res = await request(app)
        .post('/api/v1/admin/withdrawals/WD-NONEXISTENT-9999/fulfill-manual')
        .send({
          manualReference: 'BNK-REF-123',
        })

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Withdrawal record not found')
    })
  })

  // ─── 4. Root Cause Regression: TokenPayload userId Field Mapping ───────────
  describe('Root Cause Regression: TokenPayload userId vs _id/id', () => {
    it('extracts adminId from req.user.userId where _id and id are undefined', async () => {
      // Recreate the exact object shape attached by auth middleware
      currentMockUser = {
        userId: adminObjectId.toString(),
        email: 'admin@cartiva.test',
        role: 'admin',
      }
      expect((currentMockUser as any)._id).toBeUndefined()
      expect((currentMockUser as any).id).toBeUndefined()

      const withdrawal = await createTestWithdrawal()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-TOKEN-TEST',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.fulfilledBy).toBe(adminObjectId.toString())
    })

    it('directly passing adminId = "undefined" to fulfillManualWithdrawal throws 400 AppError instead of BSONError 500', async () => {
      const withdrawal = await createTestWithdrawal()

      await expect(
        adminService.fulfillManualWithdrawal({
          adminId: 'undefined',
          withdrawalId: withdrawal._id.toString(),
          manualReference: 'BNK-REF-FAIL',
        }),
      ).rejects.toThrow('Invalid admin ID format')
    })

    it('directly passing adminId = "undefined" to rejectWithdrawal throws 400 AppError instead of BSONError 500', async () => {
      const withdrawal = await createTestWithdrawal()

      await expect(
        adminService.rejectWithdrawal({
          adminId: 'undefined',
          withdrawalId: withdrawal._id.toString(),
          reason: 'Cannot verify store identity',
        }),
      ).rejects.toThrow('Invalid admin ID format')
    })
  })

  // ─── 5. Inconsistent / Corrupted Record Handling ────────────────────────────
  describe('Inconsistent Stored Withdrawal Handling', () => {
    it('safely rejects fulfillment when withdrawal record contains an invalid sellerId', async () => {
      const corruptWithdrawalId = new mongoose.Types.ObjectId()
      const corruptWithdrawalNumber = `WD-CORRUPT-${Date.now().toString(36).toUpperCase()}`

      await SellerWithdrawal.collection.insertOne({
        _id: corruptWithdrawalId,
        withdrawalNumber: corruptWithdrawalNumber,
        sellerId: 'invalid-seller-ref' as any,
        amount: 25000,
        fee: 0,
        netAmount: 25000,
        currency: 'NGN',
        status: 'pending_approval',
        payoutMethod: 'manual',
        payoutAccount: {
          bankName: 'First Bank of Nigeria',
          bankCode: '011',
          accountNumber: '0123456789',
          accountName: 'Corrupt Record Test',
        },
        auditLog: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${corruptWithdrawalId.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-SELLER-CORRUPT',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('invalid seller reference')

      // Ensure record was NOT marked completed
      const check = await SellerWithdrawal.findById(corruptWithdrawalId)
      expect(check?.status).not.toBe('completed')

      // Ensure NO false financial ledger entry was created
      const ledger = await SellerLedger.findOne({ referenceId: corruptWithdrawalNumber })
      expect(ledger).toBeNull()
    })
  })

  // ─── 6. Business Validation & Accounting Invariants ────────────────────────
  describe('Business Validation & Invariants', () => {
    it('rejects fulfillment when manualReference is missing or whitespace', async () => {
      const withdrawal = await createTestWithdrawal()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: '   ',
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('reference / transaction ID is required')
    })

    it('prevents double-fulfillment: returns 400 if withdrawal is already completed', async () => {
      const withdrawal = await createTestWithdrawal({ status: 'completed' })

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-DUPLICATE',
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('already marked as completed')
    })

    it('rejects fulfillment if withdrawal is in terminal failed or cancelled state', async () => {
      const withdrawal = await createTestWithdrawal({ status: 'cancelled' })

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/fulfill-manual`)
        .send({
          manualReference: 'BNK-REF-CANCELLED',
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain("Cannot fulfill a withdrawal in 'cancelled' state")
    })
  })

  // ─── 7. Rejection Route & Invariants ───────────────────────────────────────
  describe('POST /api/v1/admin/withdrawals/:id/reject', () => {
    it('rejects withdrawal and restores funds with ledger entry', async () => {
      const withdrawal = await createTestWithdrawal()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/reject`)
        .send({
          reason: 'Bank account name mismatch with KYC document',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')

      const updated = await SellerWithdrawal.findById(withdrawal._id)
      expect(updated?.status).toBe('rejected')
      expect(updated?.failureReason).toBe('Bank account name mismatch with KYC document')

      const ledger = await SellerLedger.findOne({
        referenceId: withdrawal.withdrawalNumber,
        type: 'WITHDRAWAL_REVERSED',
      })
      expect(ledger).toBeDefined()
      expect(ledger?.amount).toBe(25000)
    })

    it('returns HTTP 400 for malformed withdrawal ID on reject', async () => {
      const res = await request(app).post('/api/v1/admin/withdrawals/malformed-id/reject').send({
        reason: 'Testing bad ID',
      })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('Invalid withdrawal ID format')
    })

    it('returns HTTP 404 for missing withdrawal on reject', async () => {
      const nonExistent = new mongoose.Types.ObjectId().toString()
      const res = await request(app).post(`/api/v1/admin/withdrawals/${nonExistent}/reject`).send({
        reason: 'Testing non existent',
      })

      expect(res.status).toBe(404)
      expect(res.body.message).toContain('Withdrawal record not found')
    })

    it('returns HTTP 400 if rejection reason is missing', async () => {
      const withdrawal = await createTestWithdrawal()

      const res = await request(app)
        .post(`/api/v1/admin/withdrawals/${withdrawal._id.toString()}/reject`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('rejection reason is required')
    })
  })
})
