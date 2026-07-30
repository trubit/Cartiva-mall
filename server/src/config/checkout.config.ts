import type { ShippingMethod } from '../../../src/shared/types/checkout.types.js'

export interface ShippingOptionConfig {
  label: string
  description: string
  cost: number
  estimatedDays: string
}

export const SHIPPING_OPTIONS: Record<ShippingMethod, ShippingOptionConfig> = {
  standard: {
    label: 'Standard Shipping',
    description: 'Reliable delivery to your door',
    cost: parseFloat(process.env.SHIPPING_COST_STANDARD ?? '5.99'),
    estimatedDays: '5–7 business days',
  },
  express: {
    label: 'Express Shipping',
    description: 'Faster delivery guaranteed',
    cost: parseFloat(process.env.SHIPPING_COST_EXPRESS ?? '12.99'),
    estimatedDays: '2–3 business days',
  },
  sameDay: {
    label: 'Same Day Delivery',
    description: 'Order before 12 PM for same-day delivery',
    cost: parseFloat(process.env.SHIPPING_COST_SAME_DAY ?? '24.99'),
    estimatedDays: 'Today by 8 PM',
  },
}

export const CHECKOUT_SESSION_TTL_MS = parseInt(
  process.env.CHECKOUT_SESSION_TTL_MS ?? String(2 * 60 * 60 * 1000),
  10,
) // 2 hours
