import { v4 as uuidv4 } from 'uuid'

export interface CarrierDetails {
  carrierCode: string
  carrierName: string
  trackingNumber: string
  trackingUrl: string
  labelUrl: string
  estimatedDeliveryDays: number
}

export class CarrierAdapter {
  static getSupportedCarriers(): string[] {
    return ['DHL', 'FedEx', 'UPS', 'Standard Express', 'Local Courier']
  }

  static createShipmentLabel(carrier: string): CarrierDetails {
    const rawCode = carrier.toUpperCase().replace(/\s+/g, '')
    const prefix = rawCode.slice(0, 3) || 'EXP'
    const trackingNumber = `${prefix}-${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`

    return {
      carrierCode: rawCode,
      carrierName: carrier,
      trackingNumber,
      trackingUrl: `https://track.cartiva.com/${prefix}/${trackingNumber}`,
      labelUrl: `https://labels.cartiva.com/${prefix}/${trackingNumber}.pdf`,
      estimatedDeliveryDays: 3,
    }
  }
}
