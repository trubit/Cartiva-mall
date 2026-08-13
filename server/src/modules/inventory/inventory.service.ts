import mongoose from 'mongoose'
import { Warehouse, type IWarehouseDocument } from './warehouse.model.js'
import { Inventory, type IInventoryDocument } from './inventory.model.js'
import { InventoryMovement, type MovementType } from './inventoryMovement.model.js'
import { StockAlert, type AlertType } from './stockAlert.model.js'
import { Product } from '../product/product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'

const uid = (id: string) => new mongoose.Types.ObjectId(id)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const logMovement = async (
  productId: string,
  warehouseId: string,
  type: MovementType,
  quantity: number,
  createdBy: string,
  opts: { toWarehouseId?: string; note?: string; referenceId?: string } = {},
) => {
  await InventoryMovement.create({
    productId: uid(productId),
    warehouseId: uid(warehouseId),
    toWarehouseId: opts.toWarehouseId ? uid(opts.toWarehouseId) : undefined,
    type,
    quantity,
    note: opts.note,
    referenceId: opts.referenceId,
    createdBy: uid(createdBy),
  })
}

const checkAndCreateAlerts = async (inv: IInventoryDocument) => {
  const available = inv.quantity - inv.reservedQuantity

  let alertType: AlertType | null = null
  if (available <= 0) {
    alertType = 'out_of_stock'
  } else if (available <= inv.lowStockThreshold) {
    alertType = 'low_stock'
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

  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)
  const wh = await Warehouse.findOne({ _id: warehouseId, isActive: true })
  if (!wh) throw new AppError('Warehouse not found or inactive', 404)

  const existing = await Inventory.findOne({
    productId: uid(productId),
    warehouseId: uid(warehouseId),
  })
  const prevQty = existing?.quantity ?? 0
  const delta = quantity - prevQty

  const inv = await Inventory.findOneAndUpdate(
    { productId: uid(productId), warehouseId: uid(warehouseId) },
    { quantity, lowStockThreshold },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )

  await logMovement(productId, warehouseId, 'adjustment', delta, createdBy, {
    note: `Manual stock set to ${quantity}`,
  })
  await checkAndCreateAlerts(inv)

  // Sync Product.stockQuantity: sum across all warehouses
  const agg = await Inventory.aggregate<{ total: number }>([
    { $match: { productId: uid(productId) } },
    { $group: { _id: null, total: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } } } },
  ])
  const totalStock = agg[0]?.total ?? 0
  await Product.findByIdAndUpdate(productId, { stockQuantity: totalStock })

  return inv
}

// ─── Stock in/out ─────────────────────────────────────────────────────────────
export const adjustStock = async (
  productId: string,
  warehouseId: string,
  type: 'in' | 'out',
  quantity: number,
  createdBy: string,
  note?: string,
  referenceId?: string,
): Promise<IInventoryDocument> => {
  if (quantity <= 0) throw new AppError('Quantity must be positive', 400)
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const inv = await Inventory.findOne({ productId: uid(productId), warehouseId: uid(warehouseId) })
  if (!inv) throw new AppError('Inventory record not found — create one first', 404)

  if (type === 'out') {
    const available = inv.quantity - inv.reservedQuantity
    if (quantity > available) throw new AppError('Insufficient available stock', 400)
    inv.quantity -= quantity
  } else {
    inv.quantity += quantity
  }

  await inv.save()
  await logMovement(productId, warehouseId, type, quantity, createdBy, { note, referenceId })
  await checkAndCreateAlerts(inv)

  // Sync product stockQuantity
  const agg = await Inventory.aggregate<{ total: number }>([
    { $match: { productId: uid(productId) } },
    { $group: { _id: null, total: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } } } },
  ])
  await Product.findByIdAndUpdate(productId, { stockQuantity: agg[0]?.total ?? 0 })

  return inv
}

// ─── Reservation (called by checkout flow) ────────────────────────────────────
export const reserveStock = async (
  items: { productId: string; warehouseId: string; quantity: number }[],
  userId: string,
  referenceId?: string,
): Promise<void> => {
  for (const item of items) {
    const inv = await Inventory.findOne({
      productId: uid(item.productId),
      warehouseId: uid(item.warehouseId),
    })
    if (!inv) throw new AppError(`No inventory record for product ${item.productId}`, 404)

    const available = inv.quantity - inv.reservedQuantity
    if (item.quantity > available) {
      throw new AppError(`Insufficient stock for product ${item.productId}`, 400)
    }

    inv.reservedQuantity += item.quantity
    await inv.save()
    await logMovement(item.productId, item.warehouseId, 'reservation', item.quantity, userId, {
      referenceId,
    })
  }
}

export const releaseReservation = async (
  items: { productId: string; warehouseId: string; quantity: number }[],
  userId: string,
  referenceId?: string,
): Promise<void> => {
  for (const item of items) {
    await Inventory.findOneAndUpdate(
      { productId: uid(item.productId), warehouseId: uid(item.warehouseId) },
      { $inc: { reservedQuantity: -item.quantity } },
    )
    await logMovement(item.productId, item.warehouseId, 'release', item.quantity, userId, {
      referenceId,
    })
  }
}

export const confirmReservation = async (
  items: { productId: string; warehouseId: string; quantity: number }[],
  userId: string,
  referenceId?: string,
): Promise<void> => {
  for (const item of items) {
    const inv = await Inventory.findOneAndUpdate(
      { productId: uid(item.productId), warehouseId: uid(item.warehouseId) },
      { $inc: { quantity: -item.quantity, reservedQuantity: -item.quantity } },
      { returnDocument: 'after' },
    )
    if (inv) {
      await checkAndCreateAlerts(inv)
      const agg = await Inventory.aggregate<{ total: number }>([
        { $match: { productId: uid(item.productId) } },
        {
          $group: { _id: null, total: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } } },
        },
      ])
      await Product.findByIdAndUpdate(item.productId, { stockQuantity: agg[0]?.total ?? 0 })
    }
    await logMovement(item.productId, item.warehouseId, 'out', item.quantity, userId, {
      referenceId,
      note: 'Order confirmed',
    })
  }
}

// ─── Movements ────────────────────────────────────────────────────────────────
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

// ─── Stock alerts ─────────────────────────────────────────────────────────────
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
