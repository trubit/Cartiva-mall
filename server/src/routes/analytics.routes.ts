import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { adminLimiter, dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as ctrl from '../modules/analytics/analytics.controller.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))
router.use(dashboardLimiter)

router.get('/dashboard', ctrl.getDashboard)
router.get('/sales', ctrl.getSales)
router.get('/customers', ctrl.getCustomers)
router.get('/vendors', ctrl.getVendors)
router.get('/products', ctrl.getProducts)
router.get('/inventory', ctrl.getInventory)
router.get('/finance', ctrl.getFinance)
router.get('/logistics', ctrl.getLogistics)

router.post('/reports', adminLimiter, ctrl.createReport)
router.get('/reports', ctrl.listReports)
router.get('/reports/:id', ctrl.getReport)
router.post('/reports/:id/export', ctrl.exportReport)

export default router
