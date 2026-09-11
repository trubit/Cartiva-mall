import { env } from './env.js'

export interface ServiceEndpoint {
  name: string
  url: string
  timeoutMs: number
  retryCount: number
}

export const SERVICES: Record<string, ServiceEndpoint> = {
  product: {
    name: 'Product Service',
    url: env.PRODUCT_SERVICE_URL,
    timeoutMs: 5000,
    retryCount: 2,
  },
  cart: {
    name: 'Cart Service',
    url: env.CART_SERVICE_URL,
    timeoutMs: 5000,
    retryCount: 2,
  },
  order: {
    name: 'Order Service',
    url: env.ORDER_SERVICE_URL,
    timeoutMs: 8000,
    retryCount: 1,
  },
  payment: {
    name: 'Payment Service',
    url: env.PAYMENT_SERVICE_URL,
    timeoutMs: 10000,
    retryCount: 0, // Never retry mutating payment calls automatically
  },
  inventory: {
    name: 'Inventory Service',
    url: env.INVENTORY_SERVICE_URL,
    timeoutMs: 5000,
    retryCount: 2,
  },
  auth: {
    name: 'Auth Service',
    url: env.AUTH_SERVICE_URL,
    timeoutMs: 5000,
    retryCount: 1,
  },
  finance: {
    name: 'Finance Service',
    url: env.FINANCE_SERVICE_URL,
    timeoutMs: 8000,
    retryCount: 1,
  },
  logistics: {
    name: 'Logistics Service',
    url: env.LOGISTICS_SERVICE_URL,
    timeoutMs: 5000,
    retryCount: 2,
  },
}

export function getServiceForPath(path: string): ServiceEndpoint {
  if (path.startsWith('/api/v1/products')) return SERVICES.product
  if (path.startsWith('/api/v1/cart')) return SERVICES.cart
  if (path.startsWith('/api/v1/orders')) return SERVICES.order
  if (path.startsWith('/api/v1/payment')) return SERVICES.payment
  if (path.startsWith('/api/v1/inventory')) return SERVICES.inventory
  if (path.startsWith('/api/v1/auth')) return SERVICES.auth
  if (path.startsWith('/api/v1/finance')) return SERVICES.finance
  if (path.startsWith('/api/v1/shipments')) return SERVICES.logistics
  return SERVICES.auth
}
