import type { Request, Response, NextFunction } from 'express'
import { Coupon, Promotion } from './coupon.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.js'

// ─── Coupons (admin CRUD) ─────────────────────────────────────────────────────
export const listCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(),
    ])
    sendSuccess(
      res,
      { items, total, page, limit, totalPages: Math.ceil(total / limit) },
      'Coupons fetched',
    )
  } catch (err) {
    next(err)
  }
}

export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const coupon = await Coupon.create(req.body)
    sendCreated(res, coupon, 'Coupon created')
  } catch (err) {
    next(err)
  }
}

export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params['id'], req.body, {
      returnDocument: 'after',
      runValidators: true,
    })
    if (!coupon) throw new AppError('Coupon not found', 404)
    sendSuccess(res, coupon, 'Coupon updated')
  } catch (err) {
    next(err)
  }
}

export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params['id'])
    if (!coupon) throw new AppError('Coupon not found', 404)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

export const toggleCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const coupon = await Coupon.findById(req.params['id'])
    if (!coupon) throw new AppError('Coupon not found', 404)
    coupon.isActive = !coupon.isActive
    await coupon.save()
    sendSuccess(res, coupon, `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`)
  } catch (err) {
    next(err)
  }
}

// ─── Promotions (admin CRUD) ──────────────────────────────────────────────────
export const listPromotions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Promotion.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('products', 'title sku images')
        .lean(),
      Promotion.countDocuments(),
    ])
    sendSuccess(
      res,
      { items, total, page, limit, totalPages: Math.ceil(total / limit) },
      'Promotions fetched',
    )
  } catch (err) {
    next(err)
  }
}

export const createPromotion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const promo = await Promotion.create(req.body)
    sendCreated(res, promo, 'Promotion created')
  } catch (err) {
    next(err)
  }
}

export const updatePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params['id'], req.body, {
      returnDocument: 'after',
      runValidators: true,
    })
    if (!promo) throw new AppError('Promotion not found', 404)
    sendSuccess(res, promo, 'Promotion updated')
  } catch (err) {
    next(err)
  }
}

export const deletePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params['id'])
    if (!promo) throw new AppError('Promotion not found', 404)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

export const togglePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const promo = await Promotion.findById(req.params['id'])
    if (!promo) throw new AppError('Promotion not found', 404)
    promo.isActive = !promo.isActive
    await promo.save()
    sendSuccess(res, promo, `Promotion ${promo.isActive ? 'activated' : 'deactivated'}`)
  } catch (err) {
    next(err)
  }
}

// ─── Public: active promotions ────────────────────────────────────────────────
export const getActivePromotions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const now = new Date()
    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ endDate: 1 })
      .populate('products', 'title images price discountPrice')
      .lean()
    sendSuccess(res, promotions, 'Active promotions fetched')
  } catch (err) {
    next(err)
  }
}
