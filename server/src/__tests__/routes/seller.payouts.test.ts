import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import sellerRouter from '../../routes/seller.routes.js'
import { errorHandler } from '../../middlewares/error.middleware.js'
import * as sellerService from '../../modules/seller/seller.service.js'

// Mock authentication middleware to simulate authenticated seller
const mockUser = {
  userId: 'seller_user_123',
  email: 'seller@example.com',
  role: 'seller',
}

vi.mock('../../middlewares/auth.middleware.js', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as any).user = mockUser
    next()
  },
  authorize:
    (..._roles: string[]) =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}))

vi.mock('../../middlewares/rateLimiter.middleware.js', () => ({
  dashboardLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  paymentLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

vi.mock('../../modules/seller/seller.service.js', () => ({
  onboardSeller: vi.fn(),
  getSellerProfile: vi.fn(),
  updateSellerProfile: vi.fn(),
  getSellerDashboard: vi.fn(),
  getSellerAnalytics: vi.fn(),
  getSellerEarnings: vi.fn(),
  requestWithdrawal: vi.fn(),
  getSellerWithdrawals: vi.fn(),
  getSellerPayoutAccounts: vi.fn(),
  addSellerPayoutAccount: vi.fn(),
  deleteSellerPayoutAccount: vi.fn(),
  getAvailableBanks: vi.fn(),
  resolveBankAccount: vi.fn(),
  getSellerLedger: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api/seller', sellerRouter)
app.use(errorHandler)

describe('Seller Payout & Withdrawal Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/seller/earnings', () => {
    it('returns calculated revenue and available balance for seller', async () => {
      const mockEarnings = {
        totalRevenue: 50000,
        netRevenue: 47500,
        settledRevenue: 47500,
        platformFeePercent: 5,
        thisMonthRevenue: 20000,
        lastMonthRevenue: 15000,
        pendingBalance: 2500,
        availableBalance: 42500,
        withdrawnTotal: 5000,
        currency: 'NGN',
        revenueByMonth: [],
      }

      vi.mocked(sellerService.getSellerEarnings).mockResolvedValue(mockEarnings as any)

      const res = await request(app).get('/api/seller/earnings')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.availableBalance).toBe(42500)
      expect(res.body.data.netRevenue).toBe(47500)
      expect(sellerService.getSellerEarnings).toHaveBeenCalledWith('seller_user_123')
    })
  })

  describe('POST /api/seller/payout/withdraw', () => {
    it('validates minimum withdrawal amount and rejects negative/zero amounts', async () => {
      const res = await request(app).post('/api/seller/payout/withdraw').send({
        amount: 0,
        payoutAccountId: 'acc_123',
      })

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(sellerService.requestWithdrawal).not.toHaveBeenCalled()
    })

    it('processes valid withdrawal request with payout account', async () => {
      const mockWithdrawal = {
        _id: 'wd_1',
        withdrawalNumber: 'WD-2026-XYZ',
        sellerId: 'seller_user_123',
        amount: 10000,
        fee: 0,
        netAmount: 10000,
        currency: 'NGN',
        status: 'processing',
        payoutAccount: {
          bankName: 'Access Bank',
          bankCode: '044',
          accountNumber: '0123456789',
          accountName: 'John Seller',
        },
      }

      vi.mocked(sellerService.requestWithdrawal).mockResolvedValue(mockWithdrawal as any)

      const res = await request(app).post('/api/seller/payout/withdraw').send({
        amount: 10000,
        payoutAccountId: 'acc_123',
        idempotencyKey: 'idem_key_1',
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.withdrawalNumber).toBe('WD-2026-XYZ')
      expect(sellerService.requestWithdrawal).toHaveBeenCalledWith('seller_user_123', {
        amount: 10000,
        payoutAccountId: 'acc_123',
        idempotencyKey: 'idem_key_1',
      })
    })
  })

  describe('GET /api/seller/payout/withdrawals', () => {
    it('returns paginated withdrawal history for seller', async () => {
      vi.mocked(sellerService.getSellerWithdrawals).mockResolvedValue({
        withdrawals: [
          {
            _id: 'wd_1',
            withdrawalNumber: 'WD-001',
            amount: 5000,
            status: 'completed',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      } as any)

      const res = await request(app).get('/api/seller/payout/withdrawals?page=1&limit=20')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBe(1)
      expect(sellerService.getSellerWithdrawals).toHaveBeenCalledWith('seller_user_123', {
        page: 1,
        limit: 20,
        status: undefined,
      })
    })
  })

  describe('POST /api/seller/payout/accounts & GET /api/seller/payout/accounts', () => {
    it('creates and lists saved bank payout accounts', async () => {
      const mockAccount = {
        _id: 'acc_123',
        sellerId: 'seller_user_123',
        bankName: 'Guaranty Trust Bank (GTBank)',
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'John Doe Enterprise',
        isDefault: true,
        isVerified: true,
      }

      vi.mocked(sellerService.addSellerPayoutAccount).mockResolvedValue(mockAccount as any)

      const postRes = await request(app).post('/api/seller/payout/accounts').send({
        bankName: 'Guaranty Trust Bank (GTBank)',
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'John Doe Enterprise',
        isDefault: true,
      })

      expect(postRes.status).toBe(201)
      expect(postRes.body.success).toBe(true)
      expect(postRes.body.data.accountNumber).toBe('0123456789')

      vi.mocked(sellerService.getSellerPayoutAccounts).mockResolvedValue([mockAccount] as any)

      const getRes = await request(app).get('/api/seller/payout/accounts')
      expect(getRes.status).toBe(200)
      expect(getRes.body.data[0].bankName).toBe('Guaranty Trust Bank (GTBank)')
    })
  })

  describe('POST /api/seller/payout/resolve-account', () => {
    it('verifies bank account number and resolves real account holder name', async () => {
      vi.mocked(sellerService.resolveBankAccount).mockResolvedValue({
        accountNumber: '0123456789',
        accountName: 'JOHN DOE TRADING',
        bankId: 58,
      })

      const res = await request(app).post('/api/seller/payout/resolve-account').send({
        accountNumber: '0123456789',
        bankCode: '058',
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.accountName).toBe('JOHN DOE TRADING')
      expect(sellerService.resolveBankAccount).toHaveBeenCalledWith('0123456789', '058')
    })
  })
})
