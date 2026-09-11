import type { Request, Response, NextFunction } from 'express'
import * as cartService from './cart.service.js'
import { sendSuccess, sendNoContent } from '../../utils/response.js'
import type {
  AddToCartInput,
  UpdateCartItemInput,
  SyncCartInput,
} from '../../../../src/shared/validators/cart.validators.js'
import { AppError } from '../../middlewares/error.middleware.js'

const getSessionId = (req: Request): string | undefined => {
  const header = req.headers['x-session-id']
  if (typeof header === 'string' && header.trim()) return header.trim()
  return (req.query.sessionId as string) || undefined
}

export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    const cart = await cartService.getCart(userId, sessionId)
    sendSuccess(res, cart)
  } catch (err) {
    next(err)
  }
}

export const addToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    const cart = await cartService.addToCart(userId, sessionId, req.body as AddToCartInput)
    sendSuccess(res, cart, 'Item added to cart')
  } catch (err) {
    next(err)
  }
}

export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    const productId = (req.params['productId'] ||
      req.params['itemId'] ||
      req.body?.productId) as string
    const input: UpdateCartItemInput & { productId?: string } = {
      ...req.body,
      productId,
    }
    const cart = await cartService.updateCartItem(userId, sessionId, input)
    sendSuccess(res, cart, 'Cart updated')
  } catch (err) {
    next(err)
  }
}

export const removeFromCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    const productId = (req.params['productId'] ||
      req.params['itemId'] ||
      req.body?.productId) as string
    const cart = await cartService.removeCartItem(userId, sessionId, productId)
    sendSuccess(res, cart, 'Item removed from cart')
  } catch (err) {
    next(err)
  }
}

export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    await cartService.clearCart(userId, sessionId)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

export const syncCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    const input = req.body as SyncCartInput

    if (userId) {
      const cart = await cartService.syncCart(userId, input)
      sendSuccess(res, cart, 'Cart synchronized')
    } else if (sessionId) {
      for (const item of input.items || []) {
        await cartService.addToCart(undefined, sessionId, item)
      }
      const cart = await cartService.getCart(undefined, sessionId)
      sendSuccess(res, cart, 'Guest cart synchronized')
    } else {
      next(new AppError('User session or authentication is required to synchronize cart', 400))
    }
  } catch (err) {
    next(err)
  }
}

export const mergeCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId
    const guestSessionId = (req.body.guestSessionId as string) || getSessionId(req) || ''
    const cart = await cartService.mergeCart(userId, guestSessionId)
    sendSuccess(res, cart, 'Guest cart merged successfully')
  } catch (err) {
    next(err)
  }
}

export const getCartCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId = getSessionId(req)
    const count = await cartService.getCartItemCount(userId, sessionId)
    sendSuccess(res, { count }, 'Cart count fetched')
  } catch (err) {
    next(err)
  }
}

export const getSavedItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const items = await cartService.getSavedItems(userId)
    sendSuccess(res, items, 'Saved items fetched')
  } catch (err) {
    next(err)
  }
}

export const saveForLater = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const productId = req.params['productId'] as string
    const list = await cartService.saveForLater(userId, productId)
    sendSuccess(res, list, 'Item saved for later')
  } catch (err) {
    next(err)
  }
}

export const restoreSavedItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const productId = req.params['productId'] as string
    const cart = await cartService.restoreSavedItem(userId, productId)
    sendSuccess(res, cart, 'Item restored to cart')
  } catch (err) {
    next(err)
  }
}

export const removeSavedItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const productId = req.params['productId'] as string
    await cartService.removeSavedItem(userId, productId)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}
