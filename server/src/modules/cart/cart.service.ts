import mongoose from 'mongoose'
import { Cart, type ICartDocument } from './cart.model.js'
import { Checkout } from '../checkout/checkout.model.js'
import { Product } from '../product/product.model.js'
import { SaveForLater } from '../saveForLater/saveForLater.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet, cacheDelPattern } from '../../utils/cache.js'
import { eventBus } from '../event-bus/eventBus.service.js'
import type {
  AddToCartInput,
  SyncCartInput,
} from '../../../../src/shared/validators/cart.validators.js'
import {
  FLAT_TAX_FEE,
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

const recalculate = (cart: ICartDocument): void => {
  const subtotal = cart.items.reduce((s, i) => s + i.itemPrice * i.quantity, 0)
  const discountAmount = cart.discountAmount ?? 0
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const shippingCost =
    afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal === 0 ? 0 : FLAT_SHIPPING_COST
  const taxAmount = subtotal === 0 ? 0 : FLAT_TAX_FEE
  const grandTotal = Math.round((afterDiscount + shippingCost + taxAmount) * 100) / 100

  cart.cartTotal = Math.round(subtotal * 100) / 100
  cart.shippingCost = Math.round(shippingCost * 100) / 100
  cart.taxAmount = taxAmount
  cart.grandTotal = grandTotal
}

const uid = (userId: string) => new mongoose.Types.ObjectId(userId)

const getCacheKey = (userId?: string, sessionId?: string) => {
  if (userId) return `cart:user:${userId}`
  if (sessionId) return `cart:session:${sessionId}`
  return null
}

// ─── GET /cart ────────────────────────────────────────────────────────────────
export const getCart = async (userId?: string, sessionId?: string): Promise<ICartDocument> => {
  if (!userId && !sessionId) {
    throw new AppError('User ID or Session ID is required to fetch cart', 400)
  }

  const cacheKey = getCacheKey(userId, sessionId)
  if (cacheKey) {
    const cached = await cacheGet<ICartDocument>(cacheKey)
    if (cached) return cached
  }

  const query = userId ? { userId: uid(userId) } : { sessionId }
  let cart = await Cart.findOne(query).populate('items.productId', PRODUCT_POPULATE)

  if (!cart) {
    cart = await Cart.create({
      ...(userId ? { userId: uid(userId) } : { sessionId }),
      items: [],
      status: 'ACTIVE',
    })
    await cart.populate('items.productId', PRODUCT_POPULATE)

    await eventBus.publish({
      eventType: 'cart.created',
      aggregateId: (cart._id as mongoose.Types.ObjectId).toString(),
      aggregateType: 'Cart',
      payload: { cartId: (cart._id as mongoose.Types.ObjectId).toString(), userId, sessionId },
    })
  }

  if (cacheKey) {
    await cacheSet(cacheKey, cart, 300)
  }

  return cart
}

// ─── POST /cart/add ───────────────────────────────────────────────────────────
export const addToCart = async (
  userId?: string,
  sessionId?: string,
  input?: AddToCartInput,
): Promise<ICartDocument> => {
  if (!input) throw new AppError('Input is required', 400)
  const { productId, quantity, selectedVariant, selectedSize, selectedColor } = input

  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findOne({
    _id: productId,
    status: { $in: ['active', 'PUBLISHED', 'APPROVED'] },
    isActive: true,
  })
  if (!product) throw new AppError('Product not found or unavailable for purchase', 404)
  if (product.stockQuantity === 0) throw new AppError('Product is out of stock', 400)
  if (quantity > product.stockQuantity)
    throw new AppError(`Only ${product.stockQuantity} unit(s) available`, 400)

  const effectivePrice =
    product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice
      : product.price

  const query = userId ? { userId: uid(userId) } : { sessionId }
  let cart = await Cart.findOne(query)
  if (!cart) {
    cart = new Cart({
      ...(userId ? { userId: uid(userId) } : { sessionId }),
      items: [],
      status: 'ACTIVE',
    })
  }

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
  await cart.populate('items.productId', PRODUCT_POPULATE)

  if (userId) invalidateCheckout(userId)

  const cacheKey = getCacheKey(userId, sessionId)
  if (cacheKey) await cacheDelPattern(cacheKey)

  await eventBus.publish({
    eventType: 'cart.item_added',
    aggregateId: (cart._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Cart',
    payload: { productId, quantity, userId, sessionId },
  })

  return cart
}

// ─── PUT /cart/item ───────────────────────────────────────────────────────────
export const updateCartItem = async (
  param1: string | undefined,
  param2: any,
  param3?: any,
  param4?: number,
): Promise<ICartDocument> => {
  let userId: string | undefined
  let sessionId: string | undefined
  let productId: string
  let quantity: number
  let selectedVariant: string | undefined
  let selectedSize: string | undefined
  let selectedColor: string | undefined

  if (typeof param2 === 'object' && param2 !== null && param2.productId) {
    userId = param1
    productId = param2.productId
    quantity = param2.quantity
    selectedVariant = param2.selectedVariant
    selectedSize = param2.selectedSize
    selectedColor = param2.selectedColor
  } else if (typeof param3 === 'object' && param3 !== null && param3.productId) {
    userId = param1
    sessionId = param2
    productId = param3.productId
    quantity = param3.quantity
    selectedVariant = param3.selectedVariant
    selectedSize = param3.selectedSize
    selectedColor = param3.selectedColor
  } else if (typeof param2 === 'string' && typeof param3 === 'object' && param3 !== null) {
    userId = param1
    productId = param2
    quantity = param3.quantity
  } else {
    userId = param1
    sessionId = param2
    productId = param3
    quantity = param4 ?? 1
  }

  const query = userId ? { userId: uid(userId) } : { sessionId }
  const cart = await Cart.findOne(query)
  if (!cart) throw new AppError('Cart not found', 404)

  const itemIdx = cart.items.findIndex(
    (i) =>
      (i.productId.toString() === productId || (i as any)._id?.toString() === productId) &&
      (selectedVariant === undefined ||
        (i.selectedVariant ?? null) === (selectedVariant ?? null)) &&
      (selectedSize === undefined || (i.selectedSize ?? null) === (selectedSize ?? null)) &&
      (selectedColor === undefined || (i.selectedColor ?? null) === (selectedColor ?? null)),
  )

  if (itemIdx === -1) {
    await cart.populate('items.productId', PRODUCT_POPULATE)
    return cart
  }

  if (quantity === 0) {
    cart.items.splice(itemIdx, 1)
  } else {
    const product = await Product.findById(productId)
    if (product && quantity > product.stockQuantity) {
      throw new AppError(`Only ${product.stockQuantity} unit(s) available`, 400)
    }
    cart.items[itemIdx].quantity = quantity
  }

  recalculate(cart)
  await cart.save()
  await cart.populate('items.productId', PRODUCT_POPULATE)

  if (userId) invalidateCheckout(userId)

  const cacheKey = getCacheKey(userId, sessionId)
  if (cacheKey) await cacheDelPattern(cacheKey)

  await eventBus.publish({
    eventType: 'cart.item_updated',
    aggregateId: (cart._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Cart',
    payload: { productId, quantity, userId, sessionId },
  })

  return cart
}

// ─── DELETE /cart/item/:productId ─────────────────────────────────────────────
export const removeCartItem = async (
  userId: string | undefined,
  sessionId: string | undefined,
  productId: string,
  selectedVariant?: string,
  selectedSize?: string,
  selectedColor?: string,
): Promise<ICartDocument> => {
  const query = userId ? { userId: uid(userId) } : { sessionId }
  let cart = await Cart.findOne(query)
  if (!cart) {
    cart = new Cart({
      ...(userId ? { userId: uid(userId) } : { sessionId }),
      items: [],
      status: 'ACTIVE',
    })
    return cart
  }

  cart.items = cart.items.filter((i) => {
    const matchProduct =
      i.productId.toString() === productId || (i as any)._id?.toString() === productId
    if (!matchProduct) return true
    if (selectedVariant !== undefined && (i.selectedVariant ?? null) !== (selectedVariant ?? null))
      return true
    if (selectedSize !== undefined && (i.selectedSize ?? null) !== (selectedSize ?? null))
      return true
    if (selectedColor !== undefined && (i.selectedColor ?? null) !== (selectedColor ?? null))
      return true
    return false
  })

  recalculate(cart)
  await cart.save()
  await cart.populate('items.productId', PRODUCT_POPULATE)

  if (userId) invalidateCheckout(userId)

  const cacheKey = getCacheKey(userId, sessionId)
  if (cacheKey) await cacheDelPattern(cacheKey)

  await eventBus.publish({
    eventType: 'cart.item_removed',
    aggregateId: (cart._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Cart',
    payload: { productId, userId, sessionId },
  })

  return cart
}

export const removeFromCart = async (userId: string, productId: string): Promise<ICartDocument> => {
  return removeCartItem(userId, undefined, productId)
}

export const clearCart = async (userId?: string, sessionId?: string): Promise<void> => {
  const query = userId ? { userId: uid(userId) } : { sessionId }
  const cart = await Cart.findOne(query)
  if (cart) {
    cart.items = []
    cart.couponCode = undefined
    cart.discountAmount = 0
    recalculate(cart)
    await cart.save()

    const cacheKey = getCacheKey(userId, sessionId)
    if (cacheKey) await cacheDelPattern(cacheKey)

    await eventBus.publish({
      eventType: 'cart.cleared',
      aggregateId: (cart._id as mongoose.Types.ObjectId).toString(),
      aggregateType: 'Cart',
      payload: { userId, sessionId },
    })
  }
}

export const mergeCart = async (userId: string, guestSessionId: string): Promise<ICartDocument> => {
  const guestCart = await Cart.findOne({ sessionId: guestSessionId })
  let userCart = await Cart.findOne({ userId: uid(userId) })

  if (!userCart) {
    userCart = new Cart({ userId: uid(userId), items: [], status: 'ACTIVE' })
  }

  if (guestCart && guestCart.items.length > 0) {
    for (const item of guestCart.items) {
      const existingIdx = userCart.items.findIndex(
        (i) =>
          i.productId.toString() === item.productId.toString() &&
          (i.selectedVariant ?? null) === (item.selectedVariant ?? null) &&
          (i.selectedSize ?? null) === (item.selectedSize ?? null) &&
          (i.selectedColor ?? null) === (item.selectedColor ?? null),
      )

      if (existingIdx >= 0) {
        userCart.items[existingIdx].quantity += item.quantity
      } else if (userCart.items.length < MAX_CART_ITEMS) {
        userCart.items.push(item)
      }
    }

    recalculate(userCart)
    await userCart.save()
    await Cart.deleteOne({ _id: guestCart._id })
  }

  await userCart.populate('items.productId', PRODUCT_POPULATE)
  await cacheDelPattern(`cart:user:${userId}`)
  await cacheDelPattern(`cart:session:${guestSessionId}`)

  await eventBus.publish({
    eventType: 'cart.merged',
    aggregateId: (userCart._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Cart',
    payload: { userId, guestSessionId },
  })

  return userCart
}

export const syncCart = async (userId: string, input: SyncCartInput) => {
  await getCart(userId)
  for (const item of input.items) {
    await addToCart(userId, undefined, item)
  }
  return getCart(userId)
}

export const saveForLater = async (userId: string, productId: string) => {
  await removeFromCart(userId, productId)
  let list = await SaveForLater.findOne({ userId: uid(userId) })
  if (!list) list = new SaveForLater({ userId: uid(userId), items: [] })
  if (!list.items.some((i) => i.productId.toString() === productId)) {
    list.items.push({ productId: uid(productId), savedAt: new Date() })
    await list.save()
  }
  return list
}

export const getSavedItems = async (userId: string) => {
  const list = await SaveForLater.findOne({ userId: uid(userId) }).populate(
    'items.productId',
    PRODUCT_POPULATE,
  )
  if (!list) return []
  return list.items.map((i) => i.productId).filter(Boolean)
}

export const restoreSavedItem = async (userId: string, productId: string) => {
  await SaveForLater.updateOne(
    { userId: uid(userId) },
    { $pull: { items: { productId: uid(productId) } } },
  )
  return addToCart(userId, undefined, { productId, quantity: 1 })
}

export const removeSavedItem = async (userId: string, productId: string) => {
  return SaveForLater.updateOne(
    { userId: uid(userId) },
    { $pull: { items: { productId: uid(productId) } } },
  )
}

export const getCartItemCount = async (userId?: string, sessionId?: string): Promise<number> => {
  const query = userId ? { userId: uid(userId) } : { sessionId }
  const cart = await Cart.findOne(query).select('items.quantity').lean()
  if (!cart) return 0
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}
