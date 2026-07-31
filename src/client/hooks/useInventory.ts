import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService, type IWarehouse } from '../services/inventoryService.js'

export const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  warehouses: () => [...INVENTORY_KEYS.all, 'warehouses'] as const,
  product: (id: string) => [...INVENTORY_KEYS.all, 'product', id] as const,
  warehouse: (id: string, page: number) => [...INVENTORY_KEYS.all, 'warehouse', id, page] as const,
  movements: (filter?: { productId?: string; warehouseId?: string }, page?: number) =>
    [...INVENTORY_KEYS.all, 'movements', filter, page] as const,
  alerts: (page: number) => [...INVENTORY_KEYS.all, 'alerts', page] as const,
}

// ── Warehouses ────────────────────────────────────────────────────────────────
export const useWarehouses = (activeOnly = false) =>
  useQuery({
    queryKey: INVENTORY_KEYS.warehouses(),
    queryFn: () => inventoryService.getWarehouses(activeOnly),
    staleTime: 5 * 60 * 1000,
  })

export const useCreateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<IWarehouse>) => inventoryService.createWarehouse(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEYS.warehouses() }),
  })
}

export const useUpdateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IWarehouse> }) =>
      inventoryService.updateWarehouse(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEYS.warehouses() }),
  })
}

export const useDeleteWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteWarehouse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEYS.warehouses() }),
  })
}

// ── Inventory records ─────────────────────────────────────────────────────────
export const useProductInventory = (productId: string) =>
  useQuery({
    queryKey: INVENTORY_KEYS.product(productId),
    queryFn: () => inventoryService.getProductInventory(productId),
    enabled: !!productId,
    staleTime: 60 * 1000,
  })

export const useWarehouseInventory = (warehouseId: string, page = 1) =>
  useQuery({
    queryKey: INVENTORY_KEYS.warehouse(warehouseId, page),
    queryFn: () => inventoryService.getWarehouseInventory(warehouseId, page),
    enabled: !!warehouseId,
    staleTime: 60 * 1000,
  })

export const useSetInventory = (productId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pid,
      warehouseId,
      quantity,
      lowStockThreshold,
    }: {
      pid: string
      warehouseId: string
      quantity: number
      lowStockThreshold?: number
    }) => inventoryService.setInventory(pid, warehouseId, quantity, lowStockThreshold),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.product(productId ?? vars.pid) })
    },
  })
}

export const useStockIn = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      warehouseId,
      quantity,
      note,
    }: { warehouseId: string; quantity: number; note?: string }) =>
      inventoryService.stockIn(productId, warehouseId, quantity, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.product(productId) })
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all })
    },
  })
}

export const useStockOut = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      warehouseId,
      quantity,
      note,
    }: { warehouseId: string; quantity: number; note?: string }) =>
      inventoryService.stockOut(productId, warehouseId, quantity, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.product(productId) })
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all })
    },
  })
}

// ── Movements ─────────────────────────────────────────────────────────────────
export const useMovements = (
  filter?: { productId?: string; warehouseId?: string },
  page = 1,
) =>
  useQuery({
    queryKey: INVENTORY_KEYS.movements(filter, page),
    queryFn: () => inventoryService.getMovements(filter, page),
    staleTime: 60 * 1000,
  })

// ── Alerts ────────────────────────────────────────────────────────────────────
export const useStockAlerts = (page = 1) =>
  useQuery({
    queryKey: INVENTORY_KEYS.alerts(page),
    queryFn: () => inventoryService.getAlerts(page),
    staleTime: 60 * 1000,
  })

export const useResolveAlert = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alertId: string) => inventoryService.resolveAlert(alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all }),
  })
}
