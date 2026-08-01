import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { returnsService } from '../services/returnsService'
import type { ReturnStatus, ReturnType, DisputeType } from '../../shared/types/returns.types.js'

export const useMyReturns = (page = 1) =>
  useQuery({
    queryKey: ['returns', 'my', page],
    queryFn: () => returnsService.listReturns(page),
    select: (res) => res.data.data,
  })

export const useReturn = (id: string) =>
  useQuery({
    queryKey: ['return', id],
    queryFn: () => returnsService.getReturn(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })

export const useSubmitReturn = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof returnsService.submitReturn>[0]) =>
      returnsService.submitReturn(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  })
}

export const useUpdateReturnStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
      refundAmount,
    }: {
      id: string
      status: ReturnStatus
      adminNotes?: string
      refundAmount?: number
    }) => returnsService.updateStatus(id, status, adminNotes, refundAmount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  })
}

export const useMyDisputes = (page = 1) =>
  useQuery({
    queryKey: ['disputes', 'my', page],
    queryFn: () => returnsService.listDisputes(page),
    select: (res) => res.data.data,
  })

export const useOpenDispute = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      orderId: string
      returnId?: string
      type: DisputeType
      description: string
    }) => returnsService.openDispute(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  })
}

export const useAddDisputeMessage = () =>
  useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      returnsService.addDisputeMessage(id, content),
  })

export const useResolveDispute = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolution,
      resolutionNotes,
    }: {
      id: string
      resolution: 'buyer_favor' | 'seller_favor' | 'partial'
      resolutionNotes?: string
    }) => returnsService.resolveDispute(id, resolution, resolutionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  })
}

// suppress unused import warning — ReturnType is used in mutation param types
export type { ReturnType }
