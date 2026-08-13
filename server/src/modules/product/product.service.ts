import mongoose from 'mongoose'
import { Product, type IProductDocument } from './product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet, cacheDelPattern, cacheIncr } from '../../utils/cache.js'
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductFiltersInput,
} from '../../../../src/shared/validators/product.validators.js'
import type { PaginationMeta } from '../../../../src/shared/types/api.types.js'

// Escape all PCRE metacharacters before embedding user input in a RegExp.
// Without this, a crafted brand string like `(a+)+b` causes catastrophic
// backtracking in MongoDB's regex engine — a classic ReDoS attack.
const escRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Stable cache key: sort filter keys so that identical queries with different
// parameter ordering produce the same key (avoids redundant DB hits).
const filterCacheKey = (prefix: string, filters: object): string => {
  const sorted = Object.fromEntries(
    Object.entries(filters as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  )
  return `${prefix}:${JSON.stringify(sorted)}`
}

// ─── Cache TTLs ───────────────────────────────────────────────────────────────
const TTL = {
  PRODUCT_DETAIL: 120, // 2 min — individual product page
  PRODUCT_LIST: 30, // 30 s  — paginated listing (changes often)
  FEATURED: 300, // 5 min — featured products (rarely changes)
}

const VIEWS_FLUSH_INTERVAL_MS = 60_000 // flush buffered view counts every 60 s

// ─── Build Mongo filter from query params ─────────────────────────────────────
const buildFilter = (filters: ProductFiltersInput, extra: Record<string, unknown> = {}) => {
  const q: Record<string, unknown> = { ...extra }

  if (filters.category) q.category = filters.category
  if (filters.brand) q.brand = new RegExp(escRegex(filters.brand), 'i')
  if (filters.search) q.$text = { $search: filters.search }
  if (filters.inStock === true) q.stockQuantity = { $gt: 0 }
  if (filters.isFeatured === true) q.isFeatured = true
  if (filters.sellerId) q.sellerId = new mongoose.Types.ObjectId(filters.sellerId)

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    q.price = {}
    if (filters.minPrice !== undefined) (q.price as Record<string, number>).$gte = filters.minPrice
    if (filters.maxPrice !== undefined) (q.price as Record<string, number>).$lte = filters.maxPrice
  }

  if (filters.rating !== undefined) q.ratingsAverage = { $gte: filters.rating }

  return q
}

// ─── Build sort ───────────────────────────────────────────────────────────────
const buildSort = (sort?: string): Record<string, 1 | -1> => {
  switch (sort) {
    case 'price_asc':
      return { price: 1 }
    case 'price_desc':
      return { price: -1 }
    case 'rating':
      return { ratingsAverage: -1 }
    case 'popular':
      return { views: -1 }
    case 'newest':
    default:
      return { createdAt: -1 }
  }
}

// ─── Paginate helper ──────────────────────────────────────────────────────────
const paginate = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
})

// ─── Public: Get products with filters ────────────────────────────────────────
export const getProducts = async (filters: ProductFiltersInput) => {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const skip = (page - 1) * limit

  const cacheKey = filterCacheKey('products:list', filters)
  const cached = await cacheGet<{ products: unknown[]; pagination: PaginationMeta }>(cacheKey)
  if (cached) return cached

  const filter = buildFilter(filters, { status: 'active', isActive: true })
  const sort = buildSort(filters.sort)

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'firstName lastName username profileImage')
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ])

  const result = { products, pagination: paginate(page, limit, total) }
  await cacheSet(cacheKey, result, TTL.PRODUCT_LIST)
  return result
}

// ─── Public: Get single product ───────────────────────────────────────────────
export const getProductById = async (id: string): Promise<IProductDocument> => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid product ID', 400)

  // Serve from cache if available
  const cacheKey = `products:detail:${id}`
  const cached = await cacheGet<IProductDocument>(cacheKey)
  if (cached) {
    // Increment the view counter in Redis asynchronously — no DB write per request.
    // A background flush job writes the accumulated count to MongoDB every minute.
    void cacheIncr(`views:product:${id}`, VIEWS_FLUSH_INTERVAL_MS / 1000 + 120)
    return cached
  }

  const product = await Product.findOne({ _id: id, status: 'active', isActive: true })
    .populate('sellerId', 'firstName lastName username profileImage')
    .lean({ virtuals: true })

  if (!product) throw new AppError('Product not found', 404)

  // Increment view counter in Redis (non-blocking, batched)
  cacheIncr(`views:product:${id}`, VIEWS_FLUSH_INTERVAL_MS / 1000 + 120).catch((err: unknown) => {
    void err // fire-and-forget with logged failure captured at flush time
  })

  await cacheSet(cacheKey, product, TTL.PRODUCT_DETAIL)
  return product as unknown as IProductDocument
}

// ─── Background job: flush Redis view counters → MongoDB ─────────────────────
// Called from server startup on an interval (see index.ts).
export const flushViewCounters = async (): Promise<void> => {
  try {
    const { redis } = await import('../../database/redis.js')
    let cursor = '0'
    const updates: Array<{ id: string; count: number }> = []

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'views:product:*', 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        const pipeline = redis.pipeline()
        keys.forEach((k) => pipeline.getdel(k))
        const results = await pipeline.exec()
        results?.forEach((result, idx) => {
          const raw = result?.[1] as string | null
          if (raw) {
            const count = parseInt(raw, 10)
            const id = keys[idx]!.replace('views:product:', '')
            if (count > 0) updates.push({ id, count })
          }
        })
      }
    } while (cursor !== '0')

    if (updates.length === 0) return

    const bulkOps = updates.map(({ id, count }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $inc: { views: count } },
      },
    }))
    await Product.bulkWrite(bulkOps, { ordered: false })
  } catch (err) {
    const { logger } = await import('../../utils/logger.js')
    logger.error('flushViewCounters failed — view counts may be lost', { err })
  }
}

// ─── Cache invalidation helpers ───────────────────────────────────────────────
export const invalidateProductCache = async (productId?: string): Promise<void> => {
  await cacheDelPattern('products:list:*')
  if (productId) await cacheDelPattern(`products:detail:${productId}`)
}

// ─── Public: Search products ──────────────────────────────────────────────────
export const searchProducts = async (query: string, filters: ProductFiltersInput) => {
  return getProducts({ ...filters, search: query })
}

// ─── Public: Get by category ──────────────────────────────────────────────────
export const getProductsByCategory = async (category: string, filters: ProductFiltersInput) => {
  return getProducts({ ...filters, category })
}

// ─── Seller: Create product ───────────────────────────────────────────────────
export const createProduct = async (
  data: CreateProductInput,
  sellerId: string,
): Promise<IProductDocument> => {
  const existing = await Product.findOne({
    sku: data.sku.toUpperCase(),
    status: { $ne: 'blocked' },
    isActive: true,
  })
  if (existing) throw new AppError('SKU already exists', 409)

  const product = await Product.create({
    title: data.title,
    description: data.description,
    price: data.price,
    discountPrice: data.discountPrice,
    images: data.images ?? [],
    category: data.category,
    subCategory: data.subCategory,
    brand: data.brand,
    stockQuantity: data.stockQuantity,
    sku: data.sku,
    tags: data.tags ?? [],
    isFeatured: data.isFeatured ?? false,
    sellerId: new mongoose.Types.ObjectId(sellerId),
    status: 'pending',
    isActive: true,
  })

  await invalidateProductCache()
  return product
}

// ─── Seller: Update product ───────────────────────────────────────────────────
export const updateProduct = async (
  id: string,
  data: UpdateProductInput,
  sellerId: string,
  isAdmin = false,
): Promise<IProductDocument> => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid product ID', 400)

  const filter = isAdmin
    ? { _id: id }
    : { _id: id, sellerId: new mongoose.Types.ObjectId(sellerId) }
  const product = await Product.findOne(filter)
  if (!product) throw new AppError('Product not found or access denied', 404)

  if (data.sku && data.sku.toUpperCase() !== product.sku) {
    const skuExists = await Product.findOne({ sku: data.sku.toUpperCase(), _id: { $ne: id } })
    if (skuExists) throw new AppError('SKU already exists', 409)
  }

  Object.assign(product, {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.price !== undefined && { price: data.price }),
    ...(data.discountPrice !== undefined && { discountPrice: data.discountPrice }),
    ...(data.images !== undefined && { images: data.images }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.subCategory !== undefined && { subCategory: data.subCategory }),
    ...(data.brand !== undefined && { brand: data.brand }),
    ...(data.stockQuantity !== undefined && { stockQuantity: data.stockQuantity }),
    ...(data.sku !== undefined && { sku: data.sku.toUpperCase() }),
    ...(data.tags !== undefined && { tags: data.tags }),
    ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
  })

  await product.save()
  await invalidateProductCache(id)
  return product
}

// ─── Seller: Delete product (soft delete) ─────────────────────────────────────
export const deleteProduct = async (
  id: string,
  sellerId: string,
  isAdmin = false,
): Promise<void> => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid product ID', 400)

  const filter = isAdmin
    ? { _id: id }
    : { _id: id, sellerId: new mongoose.Types.ObjectId(sellerId) }
  const product = await Product.findOneAndUpdate(filter, { isActive: false, status: 'blocked' })
  if (!product) throw new AppError('Product not found or access denied', 404)

  await invalidateProductCache(id)
}

// ─── Admin: Approve product ───────────────────────────────────────────────────
export const approveProduct = async (id: string): Promise<IProductDocument> => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findByIdAndUpdate(
    id,
    { status: 'active', isActive: true },
    { returnDocument: 'after' },
  )
  if (!product) throw new AppError('Product not found', 404)
  await invalidateProductCache(id)
  return product
}

// ─── Admin: Block product ─────────────────────────────────────────────────────
export const blockProduct = async (id: string): Promise<IProductDocument> => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findByIdAndUpdate(
    id,
    { status: 'blocked', isActive: false },
    { returnDocument: 'after' },
  )
  if (!product) throw new AppError('Product not found', 404)
  await invalidateProductCache(id)
  return product
}

// ─── Seller: Get own products ─────────────────────────────────────────────────
export const getSellerProducts = async (sellerId: string, filters: ProductFiltersInput) => {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const skip = (page - 1) * limit
  const sort = buildSort(filters.sort)

  const filter: Record<string, unknown> = {
    sellerId: new mongoose.Types.ObjectId(sellerId),
  }
  if (filters.category) filter.category = filters.category
  if (filters.search) filter.$text = { $search: filters.search }

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    Product.countDocuments(filter),
  ])

  return { products, pagination: paginate(page, limit, total) }
}

// ─── Get featured products ────────────────────────────────────────────────────
export const getFeaturedProducts = async (limit = 12) => {
  const cacheKey = `products:featured:${limit}`
  const cached = await cacheGet<IProductDocument[]>(cacheKey)
  if (cached) return cached

  const products = await Product.find({ status: 'active', isActive: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sellerId', 'firstName lastName username')
    .lean({ virtuals: true })

  await cacheSet(cacheKey, products, TTL.FEATURED)
  return products
}

// ─── Trending products (highest view count among active products) ─────────────
export const getTrendingProducts = async (limit = 12) => {
  const cacheKey = `products:trending:${limit}`
  const cached = await cacheGet<IProductDocument[]>(cacheKey)
  if (cached) return cached

  const products = await Product.find({ status: 'active', isActive: true, views: { $gt: 0 } })
    .sort({ views: -1, ratingsAverage: -1 })
    .limit(limit)
    .populate('sellerId', 'firstName lastName username')
    .lean({ virtuals: true })

  await cacheSet(cacheKey, products, 120) // 2 min
  return products
}

// ─── Recommended products (high-rating active products) ───────────────────────
export const getRecommendedProducts = async (limit = 12) => {
  const cacheKey = `products:recommended:${limit}`
  const cached = await cacheGet<IProductDocument[]>(cacheKey)
  if (cached) return cached

  const products = await Product.find({
    status: 'active',
    isActive: true,
    ratingsAverage: { $gte: 4 },
    ratingsCount: { $gte: 1 },
  })
    .sort({ ratingsAverage: -1, views: -1 })
    .limit(limit)
    .populate('sellerId', 'firstName lastName username')
    .lean({ virtuals: true })

  // Fallback: if fewer than requested, fill with newest active products
  if (products.length < limit) {
    const needed = limit - products.length
    const existingIds = products.map((p) => (p as unknown as { _id: mongoose.Types.ObjectId })._id)
    const extras = await Product.find({
      status: 'active',
      isActive: true,
      _id: { $nin: existingIds },
    } as object)
      .sort({ createdAt: -1 })
      .limit(needed)
      .populate('sellerId', 'firstName lastName username')
      .lean({ virtuals: true })
    products.push(...extras)
  }

  await cacheSet(cacheKey, products, 300)
  return products
}

// ─── Related products (same category, excluding current product) ──────────────
export const getRelatedProducts = async (productId: string, limit = 8) => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findOne({ _id: productId, status: 'active', isActive: true }).lean()
  if (!product) throw new AppError('Product not found', 404)

  const cacheKey = `products:related:${productId}:${limit}`
  const cached = await cacheGet<IProductDocument[]>(cacheKey)
  if (cached) return cached

  const related = await Product.find({
    status: 'active',
    isActive: true,
    _id: { $ne: new mongoose.Types.ObjectId(productId) },
    category: product.category,
  })
    .sort({ ratingsAverage: -1, views: -1 })
    .limit(limit)
    .populate('sellerId', 'firstName lastName username')
    .lean({ virtuals: true })

  await cacheSet(cacheKey, related, 180)
  return related
}

// ─── List all active categories with product counts ───────────────────────────
export const getCategories = async () => {
  const cacheKey = 'products:categories'
  const cached = await cacheGet<{ category: string; count: number }[]>(cacheKey)
  if (cached) return cached

  const result = await Product.aggregate<{ category: string; count: number }>([
    { $match: { status: 'active', isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
  ])

  await cacheSet(cacheKey, result, 300)
  return result
}

// ─── List all active brands (optionally filtered by category) ─────────────────
export const getBrands = async (category?: string) => {
  const cacheKey = `products:brands:${category ?? 'all'}`
  const cached = await cacheGet<{ brand: string; count: number }[]>(cacheKey)
  if (cached) return cached

  const match: Record<string, unknown> = {
    status: 'active',
    isActive: true,
    brand: { $nin: [null, ''] },
  }
  if (category) match.category = category

  const result = await Product.aggregate<{ brand: string; count: number }>([
    { $match: match },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
    { $project: { _id: 0, brand: '$_id', count: 1 } },
  ])

  await cacheSet(cacheKey, result, 300)
  return result
}

// ─── Autocomplete suggestions (fast title/brand prefix search) ────────────────
export const getSearchSuggestions = async (q: string, limit = 8): Promise<string[]> => {
  if (!q || q.trim().length < 1) return []

  const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const cacheKey = `products:suggestions:${safe.toLowerCase()}:${limit}`
  const cached = await cacheGet<string[]>(cacheKey)
  if (cached) return cached

  const docs = await Product.find(
    {
      status: 'active',
      isActive: true,
      title: { $regex: safe, $options: 'i' },
    },
    { title: 1 },
  )
    .limit(limit)
    .lean()

  const suggestions = [...new Set(docs.map((d) => d.title))].slice(0, limit)
  await cacheSet(cacheKey, suggestions, 60)
  return suggestions
}
