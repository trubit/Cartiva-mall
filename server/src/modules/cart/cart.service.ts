import mongoose from 'mongoose'
import { Cart, type ICartDocument } from './cart.model.js'
import { Checkout } from '../checkout/checkout.model.js'
import { Product } from '../product/product.model.js'
import { SaveForLater } from '../saveForLater/saveForLater.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type {
  AddToCartInput,
  UpdateCartItemInput,
  SyncCartInput,
} from '../../../../src/shared/validators/cart.validators.js'
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_COST,
  MAX_CART_ITEMS,
} from '../../config/cart.config.js'

const PRODUCT_POPULATE =
  'title images price discountPrice stockQuantity sku status isActive category brand'

const invalidateCheckout = (userId: string) =>
  Checkout.deleteOne({ userId: uid(userId), status: 'pending' })
    .exec()
    .catch(() => {})

// ─── Recalculate cart totals in-place ────────────────────────────────────────
const recalculate = (cart: ICartDocument): void => {
  const subtotal = cart.items.reduce((s, i) => s + i.itemPrice * i.quantity, 0)
  const discountAmount = cart.discountAmount ?? 0
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const shippingCost =
    afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal === 0 ? 0 : FLAT_SHIPPING_COST
  const taxAmount = Math.round(afterDiscount * TAX_RATE * 100) / 100
  const grandTotal = Math.round((afterDiscount + shippingCost + taxAmount) * 100) / 100

  cart.cartTotal = Math.round(subtotal * 100) / 100
  cart.shippingCost = Math.round(shippingCost * 100) / 100
  cart.taxAmount = taxAmount
  cart.grandTotal = grandTotal
}

// ─── Resolve ObjectId from userId string ─────────────────────────────────────
const uid = (userId: string) => new mongoose.Types.ObjectId(userId)

// ─── GET /cart ────────────────────────────────────────────────────────────────
export const getCart = async (userId: string): Promise<ICartDocument> => {
  let cart = await Cart.findOne({ userId: uid(userId) }).populate(
    'items.productId',
    PRODUCT_POPULATE,
  )

  if (!cart) {
    cart = await Cart.create({ userId: uid(userId), items: [] })
    await cart.populate('items.productId', PRODUCT_POPULATE)
  }

  return cart
}

// ─── POST /cart/add ───────────────────────────────────────────────────────────
export const addToCart = async (userId: string, input: AddToCartInput): Promise<ICartDocument> => {
  const { productId, quantity, selectedVariant, selectedSize, selectedColor } = input

  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findOne({ _id: productId, status: 'active', isActive: true })
  if (!product) throw new AppError('Product not found or unavailable', 404)
  if (product.stockQuantity === 0) throw new AppError('Product is out of stock', 400)
  if (quantity > product.stockQuantity)
    throw new AppError(`Only ${product.stockQuantity} unit(s) available`, 400)

  const effectivePrice =
    product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice
      : product.price

  let cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) cart = new Cart({ userId: uid(userId), items: [] })

  if (cart.items.length >= MAX_CART_ITEMS)
    throw new AppError(`Cart cannot exceed ${MAX_CART_ITEMS} items`, 400)

  const existingIdx = cart.items.findIndex(
    (i) =>
      i.productId.toString() === productId &&
      (i.selectedVariant ?? null) === (selectedVariant ?? null) &&
      (i.selectedSize ?? null) === (selectedSize ?? null) &&
      (i.selectedColor ?? null) === (selectedColor ?? null),
  )

  if (existingIdx >= 0) {
    const newQty = cart.items[existingIdx].quantity + quantity
    if (newQty > product.stockQuantity)
      throw new AppError(`Only ${product.stockQuantity} unit(s) available`, 400)
    cart.items[existingIdx].quantity = newQty
    cart.items[existingIdx].itemPrice = effectivePrice
  } else {
    cart.items.push({
      productId: new mongoose.Types.ObjectId(productId),
      quantity,
      selectedVariant,
      selectedSize,
      selectedColor,
      itemPrice: effectivePrice,
    })
  }

  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)
  await cart.populate('items.productId', PRODUCT_POPULATE)
  return cart
}

// ─── PUT /cart/update/:productId ─────────────────────────────────────────────
export const updateCartItem = async (
  userId: string,
  productId: string,
  input: UpdateCartItemInput,
): Promise<ICartDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) throw new AppError('Cart not found', 404)

  const idx = cart.items.findIndex((i) => i.productId.toString() === productId)
  if (idx < 0) throw new AppError('Item not in cart', 404)

  if (input.quantity <= 0) {
    cart.items.splice(idx, 1)
  } else {
    const product = await Product.findOne({ _id: productId, status: 'active', isActive: true })
    if (!product) throw new AppError('Product unavailable', 404)
    if (input.quantity > product.stockQuantity)
      throw new AppError(`Only ${product.stockQuantity} unit(s) available`, 400)
    cart.items[idx].quantity = input.quantity
  }

  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)
  await cart.populate('items.productId', PRODUCT_POPULATE)
  return cart
}

// ─── DELETE /cart/remove/:productId ──────────────────────────────────────────
export const removeFromCart = async (userId: string, productId: string): Promise<ICartDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) throw new AppError('Cart not found', 404)

  const before = cart.items.length
  cart.items = cart.items.filter((i) => i.productId.toString() !== productId) as typeof cart.items
  if (cart.items.length === before) throw new AppError('Item not in cart', 404)

  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)
  await cart.populate('items.productId', PRODUCT_POPULATE)
  return cart
}

// ─── DELETE /cart/clear ───────────────────────────────────────────────────────
export const clearCart = async (userId: string): Promise<ICartDocument> => {
  const cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) throw new AppError('Cart not found', 404)

  cart.items = [] as typeof cart.items
  cart.discountAmount = 0
  cart.couponCode = undefined
  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)
  return cart
}

// ─── POST /cart/save-for-later ────────────────────────────────────────────────
export const saveForLater = async (userId: string, productId: string): Promise<ICartDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) throw new AppError('Cart not found', 404)

  const itemIdx = cart.items.findIndex((i) => i.productId.toString() === productId)
  if (itemIdx < 0) throw new AppError('Item not in cart', 404)

  cart.items.splice(itemIdx, 1)
  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)

  // Add to save-for-later list (dedup)
  await SaveForLater.findOneAndUpdate(
    { userId: uid(userId) },
    {
      $setOnInsert: { userId: uid(userId) },
      $addToSet: { items: { productId: new mongoose.Types.ObjectId(productId), savedAt: new Date() } },
    },
    { upsert: true },
  )

  await cart.populate('items.productId', PRODUCT_POPULATE)
  return cart
}

// ─── GET /cart/save-for-later ─────────────────────────────────────────────────
export const getSavedItems = async (userId: string) => {
  const doc = await SaveForLater.findOne({ userId: uid(userId) })
    .populate('items.productId', PRODUCT_POPULATE)
    .lean()
  return doc?.items ?? []
}

// ─── POST /cart/restore ───────────────────────────────────────────────────────
export const restoreSavedItem = async (
  userId: string,
  productId: string,
): Promise<ICartDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const sfl = await SaveForLater.findOne({ userId: uid(userId) })
  if (!sfl) throw new AppError('No saved items', 404)

  const itemIdx = sfl.items.findIndex((i) => i.productId.toString() === productId)
  if (itemIdx < 0) throw new AppError('Item not in saved list', 404)

  // Verify product still active
  const product = await Product.findOne({ _id: productId, status: 'active', isActive: true })
  if (!product) throw new AppError('Product no longer available', 404)

  const effectivePrice =
    product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice
      : product.price

  sfl.items.splice(itemIdx, 1)
  await sfl.save()

  let cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) cart = new Cart({ userId: uid(userId), items: [] })

  const existing = cart.items.findIndex((i) => i.productId.toString() === productId)
  if (existing >= 0) {
    cart.items[existing].quantity = Math.min(
      cart.items[existing].quantity + 1,
      product.stockQuantity,
    )
  } else {
    if (cart.items.length >= MAX_CART_ITEMS)
      throw new AppError(`Cart cannot exceed ${MAX_CART_ITEMS} items`, 400)
    cart.items.push({
      productId: new mongoose.Types.ObjectId(productId),
      quantity: 1,
      itemPrice: effectivePrice,
    })
  }

  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)
  await cart.populate('items.productId', PRODUCT_POPULATE)
  return cart
}

// ─── DELETE /cart/save-for-later/:productId ───────────────────────────────────
export const removeSavedItem = async (userId: string, productId: string): Promise<void> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)
  await SaveForLater.findOneAndUpdate(
    { userId: uid(userId) },
    { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } },
  )
}

// ─── POST /cart/sync  (guest → server merge on login) ────────────────────────
export const syncCart = async (userId: string, input: SyncCartInput): Promise<ICartDocument> => {
  let cart = await Cart.findOne({ userId: uid(userId) })
  if (!cart) cart = new Cart({ userId: uid(userId), items: [] })

  // Validate all IDs up-front and batch-fetch all products in one query
  // instead of one Product.findOne() per item (N+1 → 1).
  const validItems = input.items.filter((i) => mongoose.isValidObjectId(i.productId))
  if (validItems.length === 0) {
    await cart.save()
    return cart
  }

  const productIds = validItems.map((i) => i.productId)
  const productDocs = await Product.find({
    _id: { $in: productIds },
    status: 'active',
    isActive: true,
  })
  const productMap = new Map(productDocs.map((p) => [p._id.toString(), p]))

  for (const guestItem of validItems) {
    const product = productMap.get(guestItem.productId)
    if (!product || product.stockQuantity === 0) continue

    const effectivePrice =
      product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price

    const safeQty = Math.min(guestItem.quantity, product.stockQuantity)
    const existingIdx = cart.items.findIndex((i) => i.productId.toString() === guestItem.productId)

    if (existingIdx >= 0) {
      const merged = cart.items[existingIdx].quantity + safeQty
      cart.items[existingIdx].quantity = Math.min(merged, product.stockQuantity)
      cart.items[existingIdx].itemPrice = effectivePrice
    } else {
      if (cart.items.length >= MAX_CART_ITEMS) continue
      cart.items.push({
        productId: new mongoose.Types.ObjectId(guestItem.productId),
        quantity: safeQty,
        itemPrice: effectivePrice,
      })
    }
  }

  recalculate(cart)
  await cart.save()
  void invalidateCheckout(userId)
  await cart.populate('items.productId', PRODUCT_POPULATE)
  return cart
}
