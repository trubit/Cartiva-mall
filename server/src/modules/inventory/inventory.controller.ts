import type { Request, Response, NextFunction } from 'express'
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getInventoryForProduct,
  getInventoryForWarehouse,
  upsertInventory,
  adjustStock,
  getMovements,
  getActiveAlerts,
  resolveAlert,
} from './inventory.service.js'
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.js'

// ─── Warehouses ───────────────────────────────────────────────────────────────
export const getWarehouses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const activeOnly = req.query.active === 'true'
    sendSuccess(res, await listWarehouses(activeOnly), 'Warehouses fetched')
  } catch (err) {
    next(err)
  }
}

export const addWarehouse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendCreated(res, await createWarehouse(req.body), 'Warehouse created')
  } catch (err) {
    next(err)
  }
}

export const editWarehouse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await updateWarehouse(req.params['id'] as string, req.body),
      'Warehouse updated',
    )
  } catch (err) {
    next(err)
  }
}

export const removeWarehouse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await deleteWarehouse(req.params['id'] as string)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

// ─── Inventory records ────────────────────────────────────────────────────────
export const productInventory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await getInventoryForProduct(req.params['productId'] as string),
      'Inventory fetched',
    )
  } catch (err) {
    next(err)
  }
}

export const warehouseInventory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    sendSuccess(
      res,
      await getInventoryForWarehouse(req.params['warehouseId'] as string, page, limit),
      'Inventory fetched',
    )
  } catch (err) {
    next(err)
  }
}

export const setInventory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      productId,
      warehouseId,
      quantity,
      lowStockThreshold = 10,
    } = req.body as {
      productId: string
      warehouseId: string
      quantity: number
      lowStockThreshold?: number
    }
    const inv = await upsertInventory(
      productId,
      warehouseId,
      quantity,
      lowStockThreshold,
      req.user!.userId,
    )
    sendSuccess(res, inv, 'Inventory updated')
  } catch (err) {
    next(err)
  }
}

export const stockIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { quantity, note, referenceId } = req.body as {
      quantity: number
      note?: string
      referenceId?: string
    }
    const inv = await adjustStock(
      req.params['productId'] as string,
      req.params['warehouseId'] as string,
      'in',
      quantity,
      req.user!.userId,
      note,
      referenceId,
    )
    sendSuccess(res, inv, 'Stock added')
  } catch (err) {
    next(err)
  }
}

export const stockOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { quantity, note, referenceId } = req.body as {
      quantity: number
      note?: string
      referenceId?: string
    }
    const inv = await adjustStock(
      req.params['productId'] as string,
      req.params['warehouseId'] as string,
      'out',
      quantity,
      req.user!.userId,
      note,
      referenceId,
    )
    sendSuccess(res, inv, 'Stock removed')
  } catch (err) {
    next(err)
  }
}

// ─── Movements ────────────────────────────────────────────────────────────────
export const listMovements = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const result = await getMovements(
      {
        productId: req.query.productId as string | undefined,
        warehouseId: req.query.warehouseId as string | undefined,
      },
      page,
      limit,
    )
    sendSuccess(res, result, 'Movements fetched')
  } catch (err) {
    next(err)
  }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const listAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    sendSuccess(res, await getActiveAlerts(page, limit), 'Alerts fetched')
  } catch (err) {
    next(err)
  }
}

export const markAlertResolved = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await resolveAlert(req.params['alertId'] as string)
    sendSuccess(res, null, 'Alert resolved')
  } catch (err) {
    next(err)
  }
}
