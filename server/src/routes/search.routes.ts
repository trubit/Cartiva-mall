import { Router } from 'express'
import {
  searchProducts,
  getSuggestions,
  getAnalytics,
  rebuildIndex,
} from '../modules/search/search.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/', searchProducts)
router.get('/suggestions', getSuggestions)
router.get('/analytics', authenticate, authorize('admin'), getAnalytics)
router.post('/admin/reindex', authenticate, authorize('admin'), rebuildIndex)

export default router
