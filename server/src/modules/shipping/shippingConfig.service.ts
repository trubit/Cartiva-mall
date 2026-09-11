import mongoose from 'mongoose'
import { ShippingConfig, type IShippingConfigDocument } from './shippingConfig.model.js'
import { currencyService } from '../currency/currency.service.js'
import { roundMoney } from '../../../../src/shared/utils/money.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { User } from '../user/user.model.js'
import { logger } from '../../utils/logger.js'

export const DEFAULT_SHIPPING_RATES: Record<string, number> = {
  NGN: 1000,
  USD: 5.99,
  EUR: 5.5,
  GBP: 4.99,
  CAD: 7.5,
  AUD: 8.5,
}

/**
 * Retrieves the singleton active ShippingConfig document from the database.
 * If none exists, creates the initial default configuration.
 */
export const getShippingConfig = async (): Promise<IShippingConfigDocument> => {
  let config = await ShippingConfig.findOne({ isActive: true }).sort({ createdAt: -1 })
  if (!config) {
    config = await ShippingConfig.create({
      fixedRates: new Map(Object.entries(DEFAULT_SHIPPING_RATES)),
      defaultCurrency: 'NGN',
      defaultFee: 1000,
      isActive: true,
      auditLog: [],
    })
    logger.info('Initialized default Cartiva ShippingConfig in database')
  }
  return config
}

/**
 * Returns the authoritative shipping fee for a specified currency.
 * Single source of truth for checkout and order calculation.
 */
export const getAuthoritativeShippingFee = async (currency = 'USD'): Promise<number> => {
  const curr = (currency || 'USD').toUpperCase()
  const config = await getShippingConfig()

  let rate: number | undefined
  if (config.fixedRates instanceof Map) {
    rate = config.fixedRates.get(curr)
  } else if (typeof config.fixedRates === 'object' && config.fixedRates !== null) {
    rate = (config.fixedRates as Record<string, number>)[curr]
  }

  if (typeof rate === 'number' && !isNaN(rate) && rate >= 0) {
    return roundMoney(rate, curr)
  }

  // If specific currency rate is not configured, convert from base USD rate using currency engine
  let baseUsdRate: number | undefined
  if (config.fixedRates instanceof Map) {
    baseUsdRate = config.fixedRates.get('USD')
  } else if (typeof config.fixedRates === 'object' && config.fixedRates !== null) {
    baseUsdRate = (config.fixedRates as Record<string, number>)['USD']
  }
  const baseUsd = typeof baseUsdRate === 'number' ? baseUsdRate : DEFAULT_SHIPPING_RATES['USD']

  try {
    const conversion = await currencyService.convert(baseUsd, 'USD', curr)
    return roundMoney(conversion.targetAmount, curr)
  } catch {
    return roundMoney(baseUsd, curr)
  }
}

/**
 * Updates fixed shipping prices in the database.
 * Enforces admin authorization, input validation (finite, >= 0), and creates an audit log.
 */
export const updateShippingConfig = async (
  adminUserId: string,
  newRates: Record<string, number>,
  note?: string,
): Promise<IShippingConfigDocument> => {
  if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
    throw new AppError('Unauthorized: valid admin user ID is required', 401)
  }

  const admin = await User.findById(adminUserId).lean()
  if (!admin || admin.role !== 'admin') {
    throw new AppError('Forbidden: Only authorized administrators can change shipping prices', 403)
  }

  if (!newRates || typeof newRates !== 'object' || Object.keys(newRates).length === 0) {
    throw new AppError('Invalid rates object: at least one currency rate must be provided', 400)
  }

  const validatedRates: Record<string, number> = {}
  for (const [curr, amount] of Object.entries(newRates)) {
    const currUpper = curr.trim().toUpperCase()
    if (!currUpper || currUpper.length < 2 || currUpper.length > 5) {
      throw new AppError(`Invalid currency code: ${curr}`, 400)
    }
    const num = Number(amount)
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num) || num < 0) {
      throw new AppError(
        `Invalid shipping rate for ${currUpper}: must be a non-negative number`,
        400,
      )
    }
    validatedRates[currUpper] = roundMoney(num, currUpper)
  }

  const config = await getShippingConfig()

  // Capture previous rates for audit trail
  const previousRates: Record<string, number> = {}
  if (config.fixedRates instanceof Map) {
    config.fixedRates.forEach((val, key) => {
      previousRates[key] = val
    })
  } else if (typeof config.fixedRates === 'object' && config.fixedRates !== null) {
    Object.assign(previousRates, config.fixedRates)
  }

  // Merge validated rates into fixedRates map
  const updatedMap = new Map(Object.entries(previousRates))
  for (const [curr, val] of Object.entries(validatedRates)) {
    updatedMap.set(curr, val)
  }

  config.fixedRates = updatedMap
  config.updatedBy = new mongoose.Types.ObjectId(adminUserId)

  config.auditLog.push({
    adminId: new mongoose.Types.ObjectId(adminUserId),
    adminEmail: admin.email,
    previousRates,
    newRates: validatedRates,
    timestamp: new Date(),
    note: note || 'Admin updated fixed shipping prices',
  })

  await config.save()

  logger.info('Admin updated shipping configuration', {
    adminId: adminUserId,
    adminEmail: admin.email,
    updatedRates: validatedRates,
  })

  return config
}
