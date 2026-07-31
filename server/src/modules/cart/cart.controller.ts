import type { Request, Response, NextFunction } from 'express'
import * as cartService from './cart.service.js'
import { sendSuccess, sendNoContent } from '../../utils/response.js'
import type {
  AddToCartInput,
  UpdateCartItemInput,
  SyncCartInput,
} from '../../../../src/shared/validators/cart.validators.js'

export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.getCart(req.user!.userId)
    sendSuccess(res, cart)
  } catch (err) {
    next(err)
  }
}

export const addToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.addToCart(req.user!.userId, req.body as AddToCartInput)
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
    const cart = await cartService.updateCartItem(
      req.user!.userId,
      req.params['productId'] as string,
      req.body as UpdateCartItemInput,
    )
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
    const cart = await cartService.removeFromCart(
      req.user!.userId,
      req.params['productId'] as string,
    )
    sendSuccess(res, cart, 'Item removed from cart')
  } catch (err) {
    next(err)
  }
}

export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await cartService.clearCart(req.user!.userId)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

export const syncCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.syncCart(req.user!.userId, req.body as SyncCartInput)
    sendSuccess(res, cart, 'Cart synced')
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
    const cart = await cartService.saveForLater(
      req.user!.userId,
      req.params['productId'] as string,
    )
    sendSuccess(res, cart, 'Item saved for later')
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
    const items = await cartService.getSavedItems(req.user!.userId)
    sendSuccess(res, items, 'Saved items fetched')
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
    const cart = await cartService.restoreSavedItem(
      req.user!.userId,
      req.params['productId'] as string,
    )
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
    await cartService.removeSavedItem(req.user!.userId, req.params['productId'] as string)
    sendSuccess(res, null, 'Saved item removed')
  } catch (err) {
    next(err)
  }
}
