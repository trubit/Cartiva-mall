import mongoose from 'mongoose'
import { Checkout, type ICheckoutDocument } from './checkout.model.js'
import { Cart } from '../cart/cart.model.js'
import { Coupon } from '../coupon/coupon.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type {
  UpdateCheckoutInput,
  SelectShippingInput,
  ApplyCouponInput,
} from '../../../../src/shared/validators/checkout.validators.js'
import type { ShippingMethod } from '../../../../src/shared/types/checkout.types.js'
import { CHECKOUT_SESSION_TTL_MS } from '../../config/checkout.config.js'
import { FLAT_TAX_FEE } from '../../config/cart.config.js'

import { getAuthoritativeShippingFee } from '../shipping/shippingConfig.service.js'
import { Money, roundMoney } from '../../../../src/shared/utils/money.js'

const uid = (id: string) => new mongoose.Types.ObjectId(id)
const r2 = (n: number) => Math.round(n * 100) / 100

// ─── Recalculate pricing ──────────────────────────────────────────────────────
const recalcPricing = async (session: ICheckoutDocument, discountAmount: number): Promise<void> => {
  const subtotal = session.items.reduce((s, i) => s + i.lineTotal, 0)
  const afterDisc = Math.max(0, r2(subtotal) - r2(discountAmount))

  // Authoritative admin-controlled fixed shipping fee (USD baseline in session)
  const shippingFee = await getAuthoritativeShippingFee('USD')
  const taxAmount = subtotal === 0 ? 0 : FLAT_TAX_FEE
  const grandTotal = roundMoney(
    Money.from(afterDisc).add(shippingFee).add(taxAmount).toNumber(),
    'USD',
  )

  session.pricing = {
    subtotal: r2(subtotal),
    discountAmount: r2(discountAmount),
    shippingFee,
    taxAmount,
    grandTotal,
  }
}

// ─── GET or CREATE checkout session from cart ─────────────────────────────────
export const getOrCreateCheckout = async (userId: string): Promise<ICheckoutDocument> => {
  const existing = await Checkout.findOne({
    userId: uid(userId),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })

  if (existing) {
    // Validate session still matches cart — if cart changed, rebuild
    const currentCart = await Cart.findOne({ userId: uid(userId) })
    const cartItems = currentCart?.items ?? []
    const cartMatchesSession =
      cartItems.length === existing.items.length &&
      cartItems.every((ci) =>
        existing.items.some(
          (si) =>
            si.productId.toString() === ci.productId.toString() && si.quantity === ci.quantity,
        ),
      )
    if (cartMatchesSession) return existing
    // Cart has changed — delete stale session and rebuild below
    await existing.deleteOne()
  }

  // Build snapshot from cart
  const cart = await Cart.findOne({ userId: uid(userId) }).populate(
    'items.productId',
    'title images price discountPrice stockQuantity sku status isActive',
  )

  if (!cart || cart.items.length === 0) throw new AppError('Your cart is empty', 400)

  // Validate every item is still available + in stock
  const snapshotItems: ICheckoutDocument['items'] = []
  for (const item of cart.items) {
    if (!item.productId) continue
    const product = item.productId as unknown as {
      _id: mongoose.Types.ObjectId
      title: string
      images: string[]
      price: number
      discountPrice?: number
      stockQuantity: number
      sku: string
      status?: string
      isActive?: boolean
    }
    if (!product || !product.title) continue

    const isAvailable =
      product.isActive !== false &&
      (!product.status || ['active', 'PUBLISHED', 'APPROVED'].includes(product.status))
    if (!isAvailable) continue

    const qty = Math.min(item.quantity, Math.max(1, product.stockQuantity || 1))
    const effectivePrice =
      product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price

    snapshotItems.push({
      productId: product._id,
      title: product.title,
      image: product.images?.[0],
      sku: product.sku || 'SKU-ITEM',
      quantity: qty,
      itemPrice: effectivePrice,
      lineTotal: r2(effectivePrice * qty),
    })
  }

  if (snapshotItems.length === 0) throw new AppError('Your cart is empty', 400)

  const session = new Checkout({
    userId: uid(userId),
    items: snapshotItems,
    shippingMethod: 'standard',
    sameAsShipping: true,
    status: 'pending',
    expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS),
  })

  // Re-apply coupon if cart had one
  const discountAmt = cart.discountAmount ?? 0
  if (cart.couponCode) session.couponCode = cart.couponCode
  await recalcPricing(session, discountAmt)
  await session.save()
  return session
}

// ─── PUT /checkout/update (address) ──────────────────────────────────────────
export const updateCheckout = async (
  userId: string,
  input: UpdateCheckoutInput,
): Promise<ICheckoutDocument> => {
  const session = await getActiveSession(userId)

  session.shippingAddress = input.shippingAddress as ICheckoutDocument['shippingAddress']
  session.sameAsShipping = input.sameAsShipping ?? true
  session.billingAddress = input.sameAsShipping
    ? (input.shippingAddress as ICheckoutDocument['billingAddress'])
    : ((input.billingAddress as ICheckoutDocument['billingAddress']) ?? null)

  await recalcPricing(session, session.pricing.discountAmount)
  await session.save()
  return session
}

// ─── POST /checkout/select-shipping ──────────────────────────────────────────
export const selectShipping = async (
  userId: string,
  input: SelectShippingInput,
): Promise<ICheckoutDocument> => {
  const session = await getActiveSession(userId)

  session.shippingMethod = input.method as ShippingMethod
  await recalcPricing(session, session.pricing.discountAmount)
  await session.save()
  return session
}

// ─── POST /checkout/apply-coupon ──────────────────────────────────────────────
export const applyCoupon = async (
  userId: string,
  input: ApplyCouponInput,
): Promise<ICheckoutDocument> => {
  const session = await getActiveSession(userId)

  // ── Step 1: read-only validation (expiry, minOrderAmount) ─────────────────
  const coupon = await Coupon.findOne({ code: input.code, isActive: true })
  if (!coupon) throw new AppError('Coupon not found or inactive', 404)

  const now = new Date()
  if (coupon.expiresAt && coupon.expiresAt < now) throw new AppError('Coupon has expired', 400)

  const subtotal = session.items.reduce((s, i) => s + i.lineTotal, 0)
  if (subtotal < coupon.minOrderAmount)
    throw new AppError(
      `Minimum order amount for this coupon is $${coupon.minOrderAmount.toFixed(2)}`,
      400,
    )

  // ── Step 2: atomically claim one usage slot ────────────────────────────────
  // Without atomicity, two concurrent requests can both pass the usedCount check
  // and both apply the coupon — exceeding maxUses. The $or filter ensures the
  // increment only succeeds when there is still capacity (or no limit).
  if (coupon.maxUses !== null) {
    const claimed = await Coupon.findOneAndUpdate(
      {
        _id: coupon._id,
        isActive: true,
        usedCount: { $lt: coupon.maxUses },
      },
      { $inc: { usedCount: 1 } },
    )
    if (!claimed) throw new AppError('Coupon usage limit reached', 400)
  }
  // maxUses === null means unlimited — no slot to claim

  let discount =
    coupon.type === 'percentage' ? r2((subtotal * coupon.value) / 100) : r2(coupon.value)

  if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount)
    discount = r2(coupon.maxDiscountAmount)

  session.couponCode = coupon.code
  await recalcPricing(session, discount)
  try {
    await session.save()
  } catch (err) {
    // Roll back the claimed usage slot so it doesn't leak on session-save failure.
    if (coupon.maxUses !== null) {
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } }).catch(() => {})
    }
    throw err
  }
  return session
}

// ─── DELETE /checkout/coupon ──────────────────────────────────────────────────
export const removeCoupon = async (userId: string): Promise<ICheckoutDocument> => {
  const session = await getActiveSession(userId)
  session.couponCode = undefined
  await recalcPricing(session, 0)
  await session.save()
  return session
}

// ─── Helper: get active session or 404 ───────────────────────────────────────
const getActiveSession = async (userId: string): Promise<ICheckoutDocument> => {
  const session = await Checkout.findOne({
    userId: uid(userId),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
  if (!session)
    throw new AppError('Checkout session not found or expired — please start again', 404)
  return session
}

// ─── Exposed shipping options ─────────────────────────────────────────────────
export const getShippingOptions = async (currency = 'USD') => {
  const fee = await getAuthoritativeShippingFee(currency)
  return [
    {
      method: 'standard' as ShippingMethod,
      label: 'Verified Doorstep Delivery',
      description: 'Reliable doorstep delivery fulfilled by Cartiva Logistics with live tracking',
      cost: fee,
      currency: (currency || 'USD').toUpperCase(),
      estimatedDays: '3–5 business days',
    },
  ]
}
