import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { Warehouse, type IWarehouseDocument } from './warehouse.model.js'
import { Inventory, type IInventoryDocument } from './inventory.model.js'
import {
  InventoryMovement,
  type MovementType,
  type AdjustmentReason,
} from './inventoryMovement.model.js'
import {
  InventoryReservation,
  type IInventoryReservationDocument,
} from './inventoryReservation.model.js'
import { StockAlert, type AlertType } from './stockAlert.model.js'
import { Product } from '../product/product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { eventBus } from '../event-bus/eventBus.service.js'

const uid = (id: string) => new mongoose.Types.ObjectId(id)

const RESERVATION_EXPIRY_MINUTES = 15

// ─── Movement logging helper ──────────────────────────────────────────────────
const logMovement = async (
  productId: string,
  warehouseId: string,
  type: MovementType,
  quantity: number,
  createdBy: string,
  opts: {
    toWarehouseId?: string
    note?: string
    referenceId?: string
    reason?: AdjustmentReason | string
    previousAvailable?: number
    newAvailable?: number
  } = {},
) => {
  await InventoryMovement.create({
    productId: uid(productId),
    warehouseId: uid(warehouseId),
    toWarehouseId: opts.toWarehouseId ? uid(opts.toWarehouseId) : undefined,
    type,
    quantity,
    note: opts.note,
    referenceId: opts.referenceId,
    reason: opts.reason,
    previousAvailable: opts.previousAvailable,
    newAvailable: opts.newAvailable,
    createdBy: uid(createdBy),
  })
}

// ─── Alerts & Stock Sync Helper ───────────────────────────────────────────────
const checkAndCreateAlerts = async (inv: IInventoryDocument) => {
  const available = inv.availableQuantity

  let alertType: AlertType | null = null
  if (available <= 0) {
    alertType = 'out_of_stock'
    await eventBus.publish({
      eventType: 'inventory.out_of_stock',
      aggregateId: inv.productId.toString(),
      aggregateType: 'Inventory',
      payload: { productId: inv.productId.toString(), warehouseId: inv.warehouseId.toString() },
    })
  } else if (available <= inv.lowStockThreshold) {
    alertType = 'low_stock'
    await eventBus.publish({
      eventType: 'inventory.low_stock',
      aggregateId: inv.productId.toString(),
      aggregateType: 'Inventory',
      payload: {
        productId: inv.productId.toString(),
        warehouseId: inv.warehouseId.toString(),
        available,
        threshold: inv.lowStockThreshold,
      },
    })
  }

  if (alertType) {
    const exists = await StockAlert.findOne({
      productId: inv.productId,
      warehouseId: inv.warehouseId,
      alertType,
      isResolved: false,
    })
    if (!exists) {
      await StockAlert.create({
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        alertType,
        threshold: inv.lowStockThreshold,
        currentQuantity: available,
      })
    }
  }
}

const syncProductStock = async (productId: string) => {
  const agg = await Inventory.aggregate<{ total: number }>([
    { $match: { productId: uid(productId) } },
    { $group: { _id: null, total: { $sum: '$availableQuantity' } } },
  ])
  const totalStock = Math.max(0, agg[0]?.total ?? 0)
  await Product.findByIdAndUpdate(productId, { stockQuantity: totalStock })
}

// ─── Warehouses ───────────────────────────────────────────────────────────────
export const listWarehouses = async (activeOnly = false): Promise<IWarehouseDocument[]> =>
  Warehouse.find(activeOnly ? { isActive: true } : {})
    .populate('managerId', 'firstName lastName email')
    .lean() as unknown as IWarehouseDocument[]

export const createWarehouse = async (
  data: Partial<IWarehouseDocument>,
): Promise<IWarehouseDocument> => Warehouse.create(data)

export const updateWarehouse = async (
  id: string,
  data: Partial<IWarehouseDocument>,
): Promise<IWarehouseDocument> => {
  const wh = await Warehouse.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!wh) throw new AppError('Warehouse not found', 404)
  return wh
}

export const deleteWarehouse = async (id: string): Promise<void> => {
  const wh = await Warehouse.findByIdAndDelete(id)
  if (!wh) throw new AppError('Warehouse not found', 404)
}

// ─── Inventory records ────────────────────────────────────────────────────────
export const getInventoryForProduct = async (productId: string): Promise<IInventoryDocument[]> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)
  return Inventory.find({ productId: uid(productId) })
    .populate('warehouseId', 'name code')
    .lean() as unknown as IInventoryDocument[]
}

export const getInventoryForWarehouse = async (warehouseId: string, page = 1, limit = 20) => {
  if (!mongoose.isValidObjectId(warehouseId)) throw new AppError('Invalid warehouse ID', 400)
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Inventory.find({ warehouseId: uid(warehouseId) })
      .populate('productId', 'title sku images')
      .skip(skip)
      .limit(limit)
      .lean(),
    Inventory.countDocuments({ warehouseId: uid(warehouseId) }),
  ])
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export const upsertInventory = async (
  productId: string,
  warehouseId: string,
  quantity: number,
  lowStockThreshold: number,
  createdBy: string,
): Promise<IInventoryDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)
  if (!mongoose.isValidObjectId(warehouseId)) throw new AppError('Invalid warehouse ID', 400)
  if (quantity < 0) throw new AppError('Quantity cannot be negative', 400)

  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)
  const wh = await Warehouse.findOne({ _id: warehouseId, isActive: true })
  if (!wh) throw new AppError('Warehouse not found or inactive', 404)

  const existing = await Inventory.findOne({
    productId: uid(productId),
    warehouseId: uid(warehouseId),
  })

  const prevQty = existing?.quantity ?? 0
  const reservedQty = existing?.reservedQuantity ?? 0
  const soldQty = existing?.soldQuantity ?? 0
  const damagedQty = existing?.damagedQuantity ?? 0
  const availableQty = Math.max(0, quantity - reservedQty - soldQty - damagedQty)
  const delta = quantity - prevQty

  const inv = await Inventory.findOneAndUpdate(
    { productId: uid(productId), warehouseId: uid(warehouseId) },
    {
      $set: {
        quantity,
        availableQuantity: availableQty,
        lowStockThreshold,
      },
      $inc: { version: 1 },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )

  await logMovement(productId, warehouseId, 'adjustment', delta, createdBy, {
    note: `Manual stock set to ${quantity}`,
    reason: 'COUNT_CORRECTION',
    previousAvailable: existing?.availableQuantity ?? 0,
    newAvailable: availableQty,
  })
  await checkAndCreateAlerts(inv)
  await syncProductStock(productId)

  return inv
}

// ─── Stock Adjustments ────────────────────────────────────────────────────────
export const adjustStock = async (
  productId: string,
  warehouseId: string,
  type: 'in' | 'out' | 'damaged' | 'returned',
  quantity: number,
  createdBy: string,
  opts:
    | {
        reason?: AdjustmentReason | string
        note?: string
        referenceId?: string
      }
    | AdjustmentReason
    | string = {},
  legacyNote?: string,
  legacyReferenceId?: string,
): Promise<IInventoryDocument> => {
  if (quantity <= 0) throw new AppError('Quantity must be positive', 400)
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)
  if (!mongoose.isValidObjectId(warehouseId)) throw new AppError('Invalid warehouse ID', 400)

  // Support both options object and positional arguments for backwards compatibility
  let reason: AdjustmentReason | string | undefined
  let note: string | undefined
  let referenceId: string | undefined

  if (typeof opts === 'object' && opts !== null) {
    reason = opts.reason
    note = opts.note
    referenceId = opts.referenceId
  } else {
    reason = opts
    note = legacyNote
    referenceId = legacyReferenceId
  }

  let inv = await Inventory.findOne({ productId: uid(productId), warehouseId: uid(warehouseId) })

  if (!inv) {
    if (type === 'out' || type === 'damaged') {
      throw new AppError('Inventory record not found — create one or stock in first', 404)
    }

    const product = await Product.findById(productId)
    if (!product) throw new AppError('Product not found', 404)

    const wh = await Warehouse.findOne({ _id: warehouseId, isActive: true })
    if (!wh) throw new AppError('Warehouse not found or inactive', 404)

    inv = await Inventory.create({
      productId: uid(productId),
      warehouseId: uid(warehouseId),
      quantity: 0,
      availableQuantity: 0,
      reservedQuantity: 0,
      soldQuantity: 0,
      damagedQuantity: 0,
      lowStockThreshold: 10,
      version: 1,
    })
  }

  const prevAvailable = inv.availableQuantity

  if (type === 'out' || type === 'damaged') {
    if (quantity > inv.availableQuantity) {
      throw new AppError('Insufficient available stock for adjustment', 400)
    }
    inv.availableQuantity -= quantity
    if (type === 'damaged') {
      inv.damagedQuantity += quantity
    } else {
      inv.quantity = Math.max(0, inv.quantity - quantity)
    }
  } else {
    // 'in' or 'returned'
    inv.quantity += quantity
    inv.availableQuantity += quantity
  }

  inv.version += 1
  await inv.save()

  await logMovement(
    productId,
    warehouseId,
    type === 'in'
      ? 'in'
      : type === 'damaged'
        ? 'damaged'
        : type === 'returned'
          ? 'returned'
          : 'out',
    quantity,
    createdBy,
    {
      note,
      reason,
      referenceId,
      previousAvailable: prevAvailable,
      newAvailable: inv.availableQuantity,
    },
  )
  await checkAndCreateAlerts(inv)
  await syncProductStock(productId)

  await eventBus.publish({
    eventType: 'inventory.adjusted',
    aggregateId: productId,
    aggregateType: 'Inventory',
    payload: { productId, warehouseId, type, quantity, reason },
  })

  return inv
}

// ─── Atomic Stock Reservation (Checkout / Order Lifecycle) ───────────────────
export const reserveStock = async (
  items: { productId: string; warehouseId: string; quantity: number }[],
  userId: string,
  referenceId?: string,
  referenceType: 'checkout' | 'order' | 'manual' = 'checkout',
): Promise<IInventoryReservationDocument[]> => {
  const reservations: IInventoryReservationDocument[] = []
  const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000)

  for (const item of items) {
    if (item.quantity <= 0) throw new AppError('Reservation quantity must be positive', 400)

    // Atomic conditional update enforcing availableQuantity >= requested quantity
    const updatedInv = await Inventory.findOneAndUpdate(
      {
        productId: uid(item.productId),
        warehouseId: uid(item.warehouseId),
        availableQuantity: { $gte: item.quantity },
      },
      {
        $inc: {
          availableQuantity: -item.quantity,
          reservedQuantity: item.quantity,
          version: 1,
        },
      },
      { returnDocument: 'after' },
    )

    if (!updatedInv) {
      // Rollback any reservations performed in this loop iteration before failing
      for (const res of reservations) {
        await releaseReservation(
          [
            {
              productId: res.productId.toString(),
              warehouseId: res.warehouseId.toString(),
              quantity: res.quantity,
            },
          ],
          userId,
          res.reservationId,
        )
      }
      throw new AppError(`Insufficient available stock for product ${item.productId}`, 400)
    }

    const reservationId = `RES-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`
    const reservation = await InventoryReservation.create({
      reservationId,
      productId: uid(item.productId),
      warehouseId: uid(item.warehouseId),
      quantity: item.quantity,
      status: 'ACTIVE',
      expiresAt,
      referenceId,
      referenceType,
      userId: uid(userId),
    })

    reservations.push(reservation)

    await logMovement(item.productId, item.warehouseId, 'reservation', item.quantity, userId, {
      referenceId: reservationId,
      previousAvailable: updatedInv.availableQuantity + item.quantity,
      newAvailable: updatedInv.availableQuantity,
    })

    await checkAndCreateAlerts(updatedInv)
    await syncProductStock(item.productId)

    await eventBus.publish({
      eventType: 'inventory.stock_reserved',
      aggregateId: reservationId,
      aggregateType: 'InventoryReservation',
      payload: {
        reservationId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantity: item.quantity,
        expiresAt,
      },
    })
  }

  return reservations
}

// ─── Release Stock Reservation ────────────────────────────────────────────────
export const releaseReservation = async (
  items: { productId: string; warehouseId: string; quantity: number }[],
  userId: string,
  referenceId?: string,
): Promise<void> => {
  for (const item of items) {
    if (referenceId) {
      const resDoc = await InventoryReservation.findOne({ reservationId: referenceId })
      if (resDoc && resDoc.status === 'RELEASED') {
        // Prevent double release
        continue
      }
      if (resDoc) {
        resDoc.status = 'RELEASED'
        await resDoc.save()
      }
    }

    const updatedInv = await Inventory.findOneAndUpdate(
      {
        productId: uid(item.productId),
        warehouseId: uid(item.warehouseId),
        reservedQuantity: { $gte: item.quantity },
      },
      {
        $inc: {
          availableQuantity: item.quantity,
          reservedQuantity: -item.quantity,
          version: 1,
        },
      },
      { returnDocument: 'after' },
    )

    if (updatedInv) {
      await logMovement(item.productId, item.warehouseId, 'release', item.quantity, userId, {
        referenceId,
        previousAvailable: updatedInv.availableQuantity - item.quantity,
        newAvailable: updatedInv.availableQuantity,
      })
      await checkAndCreateAlerts(updatedInv)
      await syncProductStock(item.productId)

      await eventBus.publish({
        eventType: 'inventory.stock_released',
        aggregateId: referenceId || item.productId,
        aggregateType: 'InventoryReservation',
        payload: {
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
        },
      })
    }
  }
}

// ─── Confirm Stock Reservation (Order Paid / Confirmed) ──────────────────────
export const confirmReservation = async (
  items: { productId: string; warehouseId: string; quantity: number }[],
  userId: string,
  referenceId?: string,
): Promise<void> => {
  for (const item of items) {
    if (referenceId) {
      const resDoc = await InventoryReservation.findOne({ reservationId: referenceId })
      if (resDoc && resDoc.status === 'CONFIRMED') {
        // Prevent double confirmation
        continue
      }
      if (resDoc) {
        resDoc.status = 'CONFIRMED'
        await resDoc.save()
      }
    }

    const updatedInv = await Inventory.findOneAndUpdate(
      {
        productId: uid(item.productId),
        warehouseId: uid(item.warehouseId),
        reservedQuantity: { $gte: item.quantity },
      },
      {
        $inc: {
          quantity: -item.quantity,
          reservedQuantity: -item.quantity,
          soldQuantity: item.quantity,
          version: 1,
        },
      },
      { returnDocument: 'after' },
    )

    if (updatedInv) {
      await logMovement(item.productId, item.warehouseId, 'sold', item.quantity, userId, {
        referenceId,
        note: 'Order confirmed and stock sold',
      })
      await checkAndCreateAlerts(updatedInv)
      await syncProductStock(item.productId)

      await eventBus.publish({
        eventType: 'inventory.stock_confirmed',
        aggregateId: referenceId || item.productId,
        aggregateType: 'InventoryReservation',
        payload: {
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
        },
      })
    }
  }
}

// ─── Expire Stale Reservations (Worker / Background Process) ────────────────
export const processExpiredReservations = async (): Promise<number> => {
  const expiredDocs = await InventoryReservation.find({
    status: 'ACTIVE',
    expiresAt: { $lte: new Date() },
  }).limit(100)

  let expiredCount = 0
  for (const resDoc of expiredDocs) {
    resDoc.status = 'EXPIRED'
    await resDoc.save()

    await Inventory.findOneAndUpdate(
      {
        productId: resDoc.productId,
        warehouseId: resDoc.warehouseId,
        reservedQuantity: { $gte: resDoc.quantity },
      },
      {
        $inc: {
          availableQuantity: resDoc.quantity,
          reservedQuantity: -resDoc.quantity,
          version: 1,
        },
      },
    )

    await syncProductStock(resDoc.productId.toString())
    expiredCount++

    await eventBus.publish({
      eventType: 'inventory.reservation_expired',
      aggregateId: resDoc.reservationId,
      aggregateType: 'InventoryReservation',
      payload: { reservationId: resDoc.reservationId, productId: resDoc.productId.toString() },
    })
  }

  return expiredCount
}

// ─── Ledger Movements & History ──────────────────────────────────────────────
export const getMovements = async (
  filter: { productId?: string; warehouseId?: string },
  page = 1,
  limit = 20,
) => {
  const query: Record<string, unknown> = {}
  if (filter.productId && mongoose.isValidObjectId(filter.productId)) {
    query.productId = uid(filter.productId)
  }
  if (filter.warehouseId && mongoose.isValidObjectId(filter.warehouseId)) {
    query.warehouseId = uid(filter.warehouseId)
  }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    InventoryMovement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'title sku')
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .lean(),
    InventoryMovement.countDocuments(query),
  ])

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ─── Stock Alerts ─────────────────────────────────────────────────────────────
export const getActiveAlerts = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    StockAlert.find({ isResolved: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'title sku images')
      .populate('warehouseId', 'name code')
      .lean(),
    StockAlert.countDocuments({ isResolved: false }),
  ])
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export const resolveAlert = async (alertId: string): Promise<void> => {
  const alert = await StockAlert.findByIdAndUpdate(alertId, {
    isResolved: true,
    resolvedAt: new Date(),
  })
  if (!alert) throw new AppError('Alert not found', 404)
}
