import { Router } from 'express'
import * as currencyCtrl from '../modules/currency/currency.controller.js'

const router = Router()

router.get('/', currencyCtrl.getSupportedCurrencies)
router.get('/rates', currencyCtrl.getExchangeRates)
router.get('/convert', currencyCtrl.convertCurrency)
router.post('/convert', currencyCtrl.convertCurrency)

export default router
