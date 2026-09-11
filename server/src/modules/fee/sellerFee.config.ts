/**
 * Centralized Cartiva Marketplace Commission Configuration
 * Cartiva charges a per-unit commission automatically deducted from confirmed sales.
 * - NGN: ₦200 per product unit sold
 * - USD: $0.15 per product unit sold
 * - Other supported currencies: explicitly configured Cartiva rates or currency engine conversion
 */

export const CARTIVA_COMMISSION_CONFIG = {
  /** Per-unit commission rates for configured currencies */
  RATES: {
    NGN: 200.0,
    USD: 0.15,
    EUR: 0.14,
    GBP: 0.12,
    CAD: 0.2,
    AUD: 0.23,
    JPY: 23.0,
    CNY: 1.08,
    GHS: 2.3,
    ZAR: 2.75,
    KES: 19.5,
  } as Record<string, number>,

  /** Base USD rate for unconfigured currencies */
  BASE_USD_RATE: 0.15,
} as const

// Backward-compatible alias
export const SELLER_FEE_CONFIG = {
  BASE_SELLER_FEE: 200,
  BASE_FEE_CURRENCY: 'NGN',
  CARTIVA_COMMISSION_CONFIG,
} as const
