import type { Request, Response, NextFunction } from 'express'
import { vendorsService } from './vendors.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'

export const vendorsController = {
  // ─── Vendor Registration & Profile ───────────────────────────────────────────

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const vendor = await vendorsService.register(
        userId,
        req.body as Parameters<typeof vendorsService.register>[1],
      )
      sendCreated(res, vendor, 'Vendor registered successfully')
    } catch (err) {
      next(err)
    }
  },

  async getMyVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vendorsService.getVendorByUserId(req.user!.userId)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  async getVendorById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vendorsService.getVendor(req.params['id'] as string)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.updateProfile(
        vendorId,
        req.user!.userId,
        req.body as Parameters<typeof vendorsService.updateProfile>[2],
      )
      sendSuccess(res, result, 'Profile updated')
    } catch (err) {
      next(err)
    }
  },

  // ─── Verification ────────────────────────────────────────────────────────────

  async submitVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const { step } = req.body as { step: Parameters<typeof vendorsService.submitVerification>[2] }
      const result = await vendorsService.submitVerification(vendorId, req.user!.userId, step)
      sendSuccess(res, result, 'Verification step submitted')
    } catch (err) {
      next(err)
    }
  },

  // ─── Storefront ──────────────────────────────────────────────────────────────

  async upsertStorefront(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.createOrUpdateStorefront(
        vendorId,
        req.user!.userId,
        req.body as Parameters<typeof vendorsService.createOrUpdateStorefront>[2],
      )
      sendSuccess(res, result, 'Storefront saved')
    } catch (err) {
      next(err)
    }
  },

  async getStorefrontBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params['slug'] as string
      const result = await vendorsService.getStorefrontBySlug(slug)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  // ─── Documents ───────────────────────────────────────────────────────────────

  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.uploadDocument(
        vendorId,
        req.user!.userId,
        req.body as Parameters<typeof vendorsService.uploadDocument>[2],
      )
      sendCreated(res, result, 'Document uploaded')
    } catch (err) {
      next(err)
    }
  },

  async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.listDocuments(vendorId, req.user!.userId)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  // ─── Analytics & Score ───────────────────────────────────────────────────────

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.getAnalytics(vendorId, req.user!.userId)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  async getScore(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.getScore(vendorId)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.requestPayout(
        vendorId,
        req.user!.userId,
        req.body as Parameters<typeof vendorsService.requestPayout>[2],
      )
      sendCreated(res, result, 'Payout requested')
    } catch (err) {
      next(err)
    }
  },

  async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const page = Number(req.query['page']) || 1
      const result = await vendorsService.listPayouts(vendorId, req.user!.userId, page)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  // ─── Audit Log ───────────────────────────────────────────────────────────────

  async getAuditLog(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const page = Number(req.query['page']) || 1
      const result = await vendorsService.getAuditLog(vendorId, page)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async listAllVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query['page']) || 1
      const filters = {
        status: req.query['status'] as string | undefined,
        verificationStatus: req.query['verificationStatus'] as string | undefined,
      }
      const result = await vendorsService.listAllVendors(
        page,
        20,
        filters as Parameters<typeof vendorsService.listAllVendors>[2],
      )
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query['page']) || 1
      const result = await vendorsService.getPendingApprovals(page)
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },

  async approveVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.approveVendor(vendorId, req.user!.userId)
      sendSuccess(res, result, 'Vendor approved')
    } catch (err) {
      next(err)
    }
  },

  async rejectVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const { reason } = req.body as { reason: string }
      const result = await vendorsService.rejectVendor(vendorId, req.user!.userId, reason)
      sendSuccess(res, result, 'Vendor rejected')
    } catch (err) {
      next(err)
    }
  },

  async suspendVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const { reason } = req.body as { reason: string }
      const result = await vendorsService.suspendVendorFull(vendorId, req.user!.userId, reason)
      sendSuccess(res, result, 'Vendor suspended')
    } catch (err) {
      next(err)
    }
  },

  async reactivateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const result = await vendorsService.reactivateVendor(vendorId, req.user!.userId)
      sendSuccess(res, result, 'Vendor reactivated')
    } catch (err) {
      next(err)
    }
  },

  async blacklistVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params['id'] as string
      const { reason } = req.body as { reason: string }
      const result = await vendorsService.blacklistVendor(vendorId, req.user!.userId, reason)
      sendSuccess(res, result, 'Vendor blacklisted')
    } catch (err) {
      next(err)
    }
  },

  async reviewDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const documentId = req.params['documentId'] as string
      const { status, rejectionReason } = req.body as {
        status: 'approved' | 'rejected'
        rejectionReason?: string
      }
      const result = await vendorsService.adminReviewDocument(
        documentId,
        req.user!.userId,
        status,
        rejectionReason,
      )
      sendSuccess(res, result, `Document ${status}`)
    } catch (err) {
      next(err)
    }
  },

  async processPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payoutId = req.params['payoutId'] as string
      const { transactionId } = req.body as { transactionId: string }
      const result = await vendorsService.processPayout(payoutId, req.user!.userId, transactionId)
      sendSuccess(res, result, 'Payout processed')
    } catch (err) {
      next(err)
    }
  },
}
