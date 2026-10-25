import { describe, it, expect, vi, beforeEach } from 'vitest'
import { offlineProductStorage } from '../../services/offlineProductStorage.js'
import type { IProduct } from '../../../shared/types/product.types.js'

const mockProduct: IProduct = {
  _id: 'prod-offline-101',
  title: 'Offline Solar Controller',
  description: 'Reliable solar controller with MPPT tracking',
  price: 25000,
  category: 'Electronics',
  stockQuantity: 15,
  sku: 'SOL-CTRL-101',
  ratingsAverage: 4.8,
  ratingsCount: 12,
  images: ['/uploads/solar-1.jpg'],
  tags: ['solar', 'energy'],
  sellerId: 'seller-999',
  isActive: true,
  status: 'active',
  isFeatured: true,
  views: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('offlineProductStorage Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('safely handles environments where indexedDB is undefined without throwing', async () => {
    const originalIdb = window.indexedDB
    // @ts-expect-error test environment override
    delete window.indexedDB

    await expect(offlineProductStorage.saveProduct(mockProduct)).resolves.not.toThrow()
    await expect(offlineProductStorage.saveProducts([mockProduct])).resolves.not.toThrow()
    await expect(offlineProductStorage.getCachedProduct('prod-offline-101')).resolves.toBeNull()

    const listResult = await offlineProductStorage.getCachedProducts()
    expect(listResult).toEqual({ products: [], total: 0 })

    const featuredResult = await offlineProductStorage.getCachedFeatured()
    expect(featuredResult).toEqual([])

    await expect(offlineProductStorage.clearProductCache()).resolves.not.toThrow()

    // Restore
    window.indexedDB = originalIdb
  })

  it('safely handles empty or invalid inputs', async () => {
    await expect(offlineProductStorage.saveProduct(null as any)).resolves.not.toThrow()
    await expect(offlineProductStorage.saveProducts([])).resolves.not.toThrow()
    await expect(offlineProductStorage.getCachedProduct('')).resolves.toBeNull()
  })
})
