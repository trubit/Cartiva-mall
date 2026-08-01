import type { Request, Response, NextFunction } from 'express'
import { shippingService } from './shipping.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import type { ShipmentStatus } from './shipment.model.js'

const intQ = (v: unknown, d: number) => {
  const s = Array.isArray(v) ? (v[0] as string) : (v as string | undefined)
  const n = parseInt(s ?? '', 10)
  return isNaN(n) ? d : n
}

export const createShipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId, carrier, estimatedDelivery, shippingCost, weight } = req.body as Record<
      string,
      string
    >
    const data = await shippingService.createShipment(orderId, req.user!.userId, {
      carrier,
      estimatedDelivery,
      shippingCost: shippingCost ? Number(shippingCost) : undefined,
      weight: weight ? Number(weight) : undefined,
      sellerId: req.user!.role === 'seller' ? req.user!.userId : undefined,
    })
    sendCreated(res, data, 'Shipment created')
  } catch (err) {
    next(err)
  }
}

export const getShipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await shippingService.getShipment(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
    )
    sendSuccess(res, data, 'Shipment')
  } catch (err) {
    next(err)
  }
}

export const trackByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await shippingService.getByTrackingNumber(req.params['trackingNumber'] as string)
    sendSuccess(res, data, 'Tracking info')
  } catch (err) {
    next(err)
  }
}

export const listMyShipments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await shippingService.listForUser(
      req.user!.userId,
      intQ(req.query.page, 1),
      intQ(req.query.limit, 10),
    )
    sendSuccess(res, data, 'Shipments')
  } catch (err) {
    next(err)
  }
}

export const listAllShipments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawStatus = Array.isArray(req.query.status)
      ? (req.query.status[0] as string)
      : (req.query.status as string | undefined)
    const data = await shippingService.listForAdmin(
      intQ(req.query.page, 1),
      intQ(req.query.limit, 20),
      rawStatus,
    )
    sendSuccess(res, data, 'All shipments')
  } catch (err) {
    next(err)
  }
}

export const updateShipmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, description, location } = req.body as {
      status: ShipmentStatus
      description: string
      location?: string
    }
    const data = await shippingService.updateStatus(
      req.params['id'] as string,
      status,
      description,
      location,
    )
    sendSuccess(res, data, 'Status updated')
  } catch (err) {
    next(err)
  }
}
