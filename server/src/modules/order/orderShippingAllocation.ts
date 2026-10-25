import mongoose, { type Types } from 'mongoose'
import { Money, roundMoney } from '../../../../src/shared/utils/money.js'

export interface SellerOrderAllocation {
  sellerId: Types.ObjectId
  productSubtotal: number
  shippingFee: number
  grossAmount: number
  commissionAmount: number
  netAmount: number
}

export interface ItemForAllocation {
  productId: Types.ObjectId | string
  sellerId?: Types.ObjectId | string
  lineTotal: number
  quantity: number
}

/**
 * Calculates independent seller allocations for an order:
 * - Product subtotal: sum of item line totals for each seller.
 * - Customer-paid shipping fee: allocated to the fulfilling seller.
 *   - For single-seller orders: the full shipping fee is allocated to that seller.
 *   - For multi-seller orders: the shipping fee is proportionally split by product subtotal,
 *     with any remainder allocated to the largest subtotal seller so sum(sellerShippingFee) === order.shippingFee exactly.
 * - Platform commission: commissionPerUnit * quantity.
 * - Gross amount = productSubtotal + shippingFee.
 * - Net payout = grossAmount - commissionAmount.
 */
export function calculateSellerOrderAllocations(
  items: ItemForAllocation[],
  orderShippingFee: number,
  currency: string,
  commissionPerUnit: number,
): Map<string, SellerOrderAllocation> {
  const normCurrency = (currency || 'NGN').toUpperCase()
  const sellerMap = new Map<
    string,
    {
      sellerId: Types.ObjectId
      productSubtotal: number
      quantity: number
      shippingFee: number
      commissionAmount: number
      grossAmount: number
      netAmount: number
    }
  >()

  // 1. Group by seller and compute product subtotals & item quantities
  for (const item of items) {
    if (!item.sellerId) continue
    const sellerKey = item.sellerId.toString()
    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, {
        sellerId: new mongoose.Types.ObjectId(sellerKey),
        productSubtotal: 0,
        quantity: 0,
        shippingFee: 0,
        commissionAmount: 0,
        grossAmount: 0,
        netAmount: 0,
      })
    }
    const entry = sellerMap.get(sellerKey)!
    entry.productSubtotal = Money.from(entry.productSubtotal)
      .add(item.lineTotal)
      .round(normCurrency)
    entry.quantity += item.quantity || 1
  }

  const sellers = Array.from(sellerMap.values())
  if (sellers.length === 0) {
    return new Map()
  }

  const totalProductSubtotal = sellers.reduce(
    (sum, s) => Money.from(sum).add(s.productSubtotal).round(normCurrency),
    0,
  )

  // 2. Allocate customer-paid shipping fee
  const safeOrderShippingFee = Math.max(0, roundMoney(orderShippingFee || 0, normCurrency))

  if (sellers.length === 1) {
    sellers[0].shippingFee = safeOrderShippingFee
  } else if (safeOrderShippingFee > 0) {
    let assignedShipping = 0
    // Sort descending by productSubtotal to identify the primary seller for remainder allocation
    const sortedIndices = sellers
      .map((s, idx) => ({ idx, subtotal: s.productSubtotal }))
      .sort((a, b) => b.subtotal - a.subtotal)

    for (let i = 0; i < sellers.length; i++) {
      const s = sellers[i]
      const ratio =
        totalProductSubtotal > 0 ? s.productSubtotal / totalProductSubtotal : 1 / sellers.length
      const allocated = roundMoney(
        Money.from(safeOrderShippingFee).multiply(ratio).toNumber(),
        normCurrency,
      )
      s.shippingFee = allocated
      assignedShipping = Money.from(assignedShipping).add(allocated).round(normCurrency)
    }

    // Remainder adjustment to guarantee exact equality without double-counting or loss
    const remainder = roundMoney(
      Money.from(safeOrderShippingFee).subtract(assignedShipping).toNumber(),
      normCurrency,
    )
    if (remainder !== 0 && sortedIndices.length > 0) {
      const primaryIndex = sortedIndices[0].idx
      sellers[primaryIndex].shippingFee = Money.from(sellers[primaryIndex].shippingFee)
        .add(remainder)
        .round(normCurrency)
    }
  }

  // 3. Compute commission, gross amount, and net seller payout
  for (const s of sellers) {
    s.commissionAmount = roundMoney(
      Money.from(commissionPerUnit).multiply(s.quantity).toNumber(),
      normCurrency,
    )
    s.grossAmount = Money.from(s.productSubtotal).add(s.shippingFee).round(normCurrency)
    s.netAmount = Math.max(
      0,
      Money.from(s.grossAmount).subtract(s.commissionAmount).round(normCurrency),
    )
  }

  const resultMap = new Map<string, SellerOrderAllocation>()
  for (const s of sellers) {
    resultMap.set(s.sellerId.toString(), {
      sellerId: s.sellerId,
      productSubtotal: s.productSubtotal,
      shippingFee: s.shippingFee,
      grossAmount: s.grossAmount,
      commissionAmount: s.commissionAmount,
      netAmount: s.netAmount,
    })
  }

  return resultMap
}
