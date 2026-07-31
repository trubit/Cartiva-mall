import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  getWarehouses,
  addWarehouse,
  editWarehouse,
  removeWarehouse,
  productInventory,
  warehouseInventory,
  setInventory,
  stockIn,
  stockOut,
  listMovements,
  listAlerts,
  markAlertResolved,
} from '../modules/inventory/inventory.controller.js'

const router = Router()

// All inventory routes require authentication
router.use(authenticate)

// ─── Warehouses (admin only) ──────────────────────────────────────────────────
router.get('/warehouses', authorize('admin'), getWarehouses)
router.post('/warehouses', authorize('admin'), addWarehouse)
router.put('/warehouses/:id', authorize('admin'), editWarehouse)
router.delete('/warehouses/:id', authorize('admin'), removeWarehouse)

// ─── Inventory records (seller + admin) ──────────────────────────────────────
router.get('/product/:productId', authorize('seller', 'admin'), productInventory)
router.get('/warehouse/:warehouseId', authorize('seller', 'admin'), warehouseInventory)
router.post('/set', authorize('seller', 'admin'), setInventory)
router.post('/product/:productId/warehouse/:warehouseId/in', authorize('seller', 'admin'), stockIn)
router.post('/product/:productId/warehouse/:warehouseId/out', authorize('seller', 'admin'), stockOut)

// ─── Movements ────────────────────────────────────────────────────────────────
router.get('/movements', authorize('seller', 'admin'), listMovements)

// ─── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts', authorize('seller', 'admin'), listAlerts)
router.patch('/alerts/:alertId/resolve', authorize('seller', 'admin'), markAlertResolved)

export default router
