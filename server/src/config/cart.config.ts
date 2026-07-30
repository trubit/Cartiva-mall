export const TAX_RATE = parseFloat(process.env.TAX_RATE ?? '0.08') // 8%
export const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD ?? '75') // $75
export const FLAT_SHIPPING_COST = parseFloat(process.env.FLAT_SHIPPING_COST ?? '5.99') // $5.99
export const MAX_CART_ITEMS = parseInt(process.env.MAX_CART_ITEMS ?? '50', 10)
