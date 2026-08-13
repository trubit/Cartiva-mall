import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as ctrl from '../modules/forecast/forecast.controller.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))
router.use(dashboardLimiter)

router.get('/sales', ctrl.getSalesForecast)
router.get('/inventory', ctrl.getInventoryForecast)
router.get('/customers', ctrl.getCustomerForecast)
router.get('/products', ctrl.getProductForecast)
router.get('/vendors', ctrl.getVendorForecast)
router.get('/logistics', ctrl.getLogisticsForecast)
router.get('/finance', ctrl.getFinanceForecast)
router.get('/recommendations', ctrl.getRecommendations)
router.post('/scenario', ctrl.runScenario)
router.get('/history', ctrl.getForecastHistory)

export default router
