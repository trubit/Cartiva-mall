import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shippingService } from '../services/shippingService'
import type { ShipmentStatus } from '../../shared/types/shipping.types.js'

export const useShipmentTracking = (trackingNumber: string) =>
  useQuery({
    queryKey: ['shipment', 'track', trackingNumber],
    queryFn: () => shippingService.trackByNumber(trackingNumber),
    select: (res) => res.data.data,
    enabled: !!trackingNumber,
    refetchInterval: 60_000,
  })

export const useMyShipments = (page = 1) =>
  useQuery({
    queryKey: ['shipments', 'my', page],
    queryFn: () => shippingService.getMyShipments(page),
    select: (res) => res.data.data,
  })

export const useShipment = (id: string) =>
  useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shippingService.getShipment(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })

export const useAllShipments = (page = 1, status?: ShipmentStatus) =>
  useQuery({
    queryKey: ['shipments', 'all', page, status],
    queryFn: () => shippingService.listAll(page, 20, status),
    select: (res) => res.data.data,
  })

export const useUpdateShipmentStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      location,
      description,
    }: {
      id: string
      status: ShipmentStatus
      location?: string
      description?: string
    }) => shippingService.updateStatus(id, status, location, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] })
    },
  })
}
