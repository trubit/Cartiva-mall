export const FLAT_TAX_FEE = parseFloat(process.env.FLAT_TAX_FEE ?? '0.022') // 0.022 USD flat tax fee
export const TAX_RATE = FLAT_TAX_FEE
export const MAX_CART_ITEMS = parseInt(process.env.MAX_CART_ITEMS ?? '50', 10)
