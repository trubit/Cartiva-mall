import api from './api.js'
import type { IServerCart } from '../../shared/types/cart.types.js'
import type {
  AddToCartInput,
  UpdateCartItemInput,
  SyncCartInput,
} from '../../shared/validators/cart.validators.js'

const unwrap = <T>(res: { data: { data?: T } }): T => res.data.data as T

export const cartService = {
  getCart: (): Promise<IServerCart> => api.get('/cart').then(unwrap<IServerCart>),

  addToCart: (input: AddToCartInput): Promise<IServerCart> =>
    api.post('/cart/add', input).then(unwrap<IServerCart>),

  updateCartItem: (productId: string, input: UpdateCartItemInput): Promise<IServerCart> =>
    api.put(`/cart/update/${productId}`, input).then(unwrap<IServerCart>),

  removeFromCart: (productId: string): Promise<IServerCart> =>
    api.delete(`/cart/remove/${productId}`).then(unwrap<IServerCart>),

  clearCart: (): Promise<void> => api.delete('/cart/clear').then(() => undefined),

  syncCart: (input: SyncCartInput): Promise<IServerCart> =>
    api.post('/cart/sync', input).then(unwrap<IServerCart>),
}
