import type { IProduct } from '../../shared/types/product.types.js'

const DB_NAME = 'cartiva_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'cached_products'
const MAX_CACHED_PRODUCTS = 100

export interface CachedProductRecord {
  product: IProduct
  cachedAt: number
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'product._id' })
          store.createIndex('category', 'product.category', { unique: false })
          store.createIndex('cachedAt', 'cachedAt', { unique: false })
          store.createIndex('isFeatured', 'product.isFeatured', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        console.warn('[OfflineDB] Failed to open IndexedDB, using in-memory/bypass fallback')
        resolve(null)
      }
    } catch (e) {
      console.warn('[OfflineDB] IndexedDB access restricted or unavailable:', e)
      resolve(null)
    }
  })
}

/**
 * Trims oldest cached items if total count exceeds MAX_CACHED_PRODUCTS
 */
async function enforceMaxQuota(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()

      countReq.onsuccess = () => {
        const count = countReq.result
        if (count <= MAX_CACHED_PRODUCTS) {
          return resolve()
        }

        const itemsToDelete = count - MAX_CACHED_PRODUCTS
        const index = store.index('cachedAt')
        let deleted = 0
        const cursorReq = index.openCursor()

        cursorReq.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor && deleted < itemsToDelete) {
            cursor.delete()
            deleted++
            cursor.continue()
          } else {
            resolve()
          }
        }

        cursorReq.onerror = () => resolve()
      }

      countReq.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export const offlineProductStorage = {
  /**
   * Save or update a single product in IndexedDB
   */
  async saveProduct(product: IProduct): Promise<void> {
    if (!product?._id) return
    const db = await openDatabase()
    if (!db) return

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const record: CachedProductRecord = {
          product,
          cachedAt: Date.now(),
        }
        store.put(record)

        tx.oncomplete = () => {
          void enforceMaxQuota(db)
          resolve()
        }
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  },

  /**
   * Save multiple products into IndexedDB batch
   */
  async saveProducts(products: IProduct[]): Promise<void> {
    if (!Array.isArray(products) || products.length === 0) return
    const db = await openDatabase()
    if (!db) return

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const now = Date.now()

        for (const product of products) {
          if (product?._id) {
            store.put({ product, cachedAt: now })
          }
        }

        tx.oncomplete = () => {
          void enforceMaxQuota(db)
          resolve()
        }
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  },

  /**
   * Get a single cached product by ID
   */
  async getCachedProduct(productId: string): Promise<IProduct | null> {
    if (!productId) return null
    const db = await openDatabase()
    if (!db) return null

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(productId)

        req.onsuccess = () => {
          const record = req.result as CachedProductRecord | undefined
          resolve(record?.product || null)
        }
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  },

  /**
   * Get cached products with optional category, search, and pagination
   */
  async getCachedProducts(options?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ products: IProduct[]; total: number }> {
    const db = await openDatabase()
    if (!db) return { products: [], total: 0 }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()

        req.onsuccess = () => {
          const records = (req.result as CachedProductRecord[]) || []
          let filtered = records.map((r) => r.product)

          if (options?.category && options.category !== 'all') {
            filtered = filtered.filter(
              (p) => p.category?.toLowerCase() === options.category?.toLowerCase(),
            )
          }

          if (options?.search && options.search.trim()) {
            const query = options.search.toLowerCase()
            filtered = filtered.filter(
              (p) =>
                p.title?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query) ||
                p.brand?.toLowerCase().includes(query),
            )
          }

          const total = filtered.length
          const page = options?.page ?? 1
          const limit = options?.limit ?? 12
          const start = (page - 1) * limit
          const paginated = filtered.slice(start, start + limit)

          resolve({ products: paginated, total })
        }

        req.onerror = () => resolve({ products: [], total: 0 })
      } catch {
        resolve({ products: [], total: 0 })
      }
    })
  },

  /**
   * Get cached featured products for offline homepage
   */
  async getCachedFeatured(limit = 12): Promise<IProduct[]> {
    const db = await openDatabase()
    if (!db) return []

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()

        req.onsuccess = () => {
          const records = (req.result as CachedProductRecord[]) || []
          const featured = records
            .map((r) => r.product)
            .filter((p) => p.isFeatured || p.isActive)
            .slice(0, limit)
          resolve(featured)
        }
        req.onerror = () => resolve([])
      } catch {
        resolve([])
      }
    })
  },

  /**
   * Purge the offline product cache (used upon logout or storage maintenance)
   */
  async clearProductCache(): Promise<void> {
    const db = await openDatabase()
    if (!db) return

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  },
}
