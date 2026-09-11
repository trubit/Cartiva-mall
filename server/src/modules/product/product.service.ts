import mongoose from 'mongoose'
import { Product, type IProductDocument, type ProductLifecycleStatus } from './product.model.js'
import { Category, type ICategoryDocument } from './category.model.js'
import { Brand } from './brand.model.js'
import { ProductVariant } from './variant.model.js'
import { SellerProfile } from '../seller/seller.model.js'
import { SellerPayoutAccount } from '../seller/sellerPayout.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet, cacheDelPattern, cacheIncr } from '../../utils/cache.js'
import { eventBus } from '../event-bus/eventBus.service.js'
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductFiltersInput,
} from '../../../../src/shared/validators/product.validators.js'
import type { PaginationMeta } from '../../../../src/shared/types/api.types.js'

const escRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const filterCacheKey = (prefix: string, filters: object): string => {
  const sorted = Object.fromEntries(
    Object.entries(filters as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  )
  return `${prefix}:${JSON.stringify(sorted)}`
}

const TTL = {
  PRODUCT_DETAIL: 120,
  PRODUCT_LIST: 30,
  FEATURED: 300,
  CATEGORY_TREE: 600,
  BRAND_LIST: 600,
}

const buildFilter = (filters: ProductFiltersInput, extra: Record<string, unknown> = {}) => {
  const q: Record<string, unknown> = { ...extra }

  if (filters.category) q.category = filters.category
  if (filters.brand) q.brand = new RegExp(escRegex(filters.brand), 'i')
  if (filters.search) q.$text = { $search: filters.search }
  if (filters.inStock === true) q.stockQuantity = { $gt: 0 }
  if (filters.sellerId) {
    const sIdStr = String(filters.sellerId)
    if (mongoose.Types.ObjectId.isValid(sIdStr)) {
      q.sellerId = { $in: [new mongoose.Types.ObjectId(sIdStr), sIdStr] }
    } else {
      q.sellerId = sIdStr
    }
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    q.price = {}
    if (filters.minPrice !== undefined) (q.price as Record<string, number>).$gte = filters.minPrice
    if (filters.maxPrice !== undefined) (q.price as Record<string, number>).$lte = filters.maxPrice
  }

  if (filters.rating !== undefined) q.ratingsAverage = { $gte: filters.rating }

  return q
}

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

const paginate = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
})

// ─── Public: Get products with filters ────────────────────────────────────────
export const getProducts = async (
  filters: ProductFiltersInput & { ignorePublicStatus?: boolean },
) => {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const skip = (page - 1) * limit

  const cacheKey = filterCacheKey('products:list', filters)
  const cached = await cacheGet<{ products: unknown[]; pagination: PaginationMeta }>(cacheKey)
  if (cached) return cached

  const extraFilter: Record<string, unknown> = {}
  if (!filters.sellerId && !filters.ignorePublicStatus && !(filters as any).status) {
    extraFilter.status = { $in: ['active', 'PUBLISHED', 'APPROVED', 'pending', 'DRAFT'] }
  }

  const filter = buildFilter(filters, extraFilter)
  const sort = buildSort(filters.sort)

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .populate('sellerId', 'firstName lastName name storeName email')
      .lean(),
    Product.countDocuments(filter),
  ])

  const result = { products, pagination: paginate(page, limit, total) }
  await cacheSet(cacheKey, result, TTL.PRODUCT_LIST)
  return result
}

// Helper to construct public seller information DTO including bank details for physical transfer
const buildPublicSellerInfo = async (userDoc: any) => {
  if (!userDoc || typeof userDoc !== 'object') return null
  const userId = userDoc._id || userDoc.id
  const profile = userId ? await SellerProfile.findOne({ userId }).lean() : null
  const bankAccount = userId
    ? await SellerPayoutAccount.findOne({ sellerId: userId }).sort({ isDefault: -1 }).lean()
    : null

  const storeName =
    profile?.storeName || userDoc.storeName || `${userDoc.firstName || 'Seller'}'s Store`
  const storeLogo = profile?.storeLogo || userDoc.profileImage || userDoc.avatar || ''
  const storeDescription = profile?.storeDescription || ''
  const phoneNumber = userDoc.phoneNumber || ''
  const whatsappNumber = profile?.whatsappNumber || userDoc.phoneNumber || ''
  const country = profile?.storeAddress?.country || userDoc.address?.country || ''
  const state = profile?.storeAddress?.state || userDoc.address?.state || ''
  const city = profile?.storeAddress?.city || userDoc.address?.city || ''
  const publicLocation =
    profile?.publicLocation || [city, state, country].filter(Boolean).join(', ')

  return {
    sellerId: userId,
    storeName,
    storeLogo,
    storeDescription,
    phoneNumber,
    whatsappNumber,
    country,
    state,
    city,
    publicLocation,
    rating: profile?.rating ?? 5.0,
    isVerified: profile?.isVerified ?? false,
    totalSales: profile?.totalSales ?? 0,
    sellerSince: userDoc.createdAt || profile?.createdAt,
    bankDetails: bankAccount
      ? {
          bankName: bankAccount.bankName,
          bankCode: bankAccount.bankCode,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          currency: bankAccount.currency || 'NGN',
        }
      : null,
  }
}

// ─── Public: Get single product by ID ─────────────────────────────────────────
export const getProductById = async (id: string) => {
  const cacheKey = `product:detail:${id}`
  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) return cached

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid product ID format', 400)
  }

  const product = await Product.findById(id)
    .populate(
      'sellerId',
      'firstName lastName username email phoneNumber profileImage address createdAt',
    )
    .lean()

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  if (['blocked', 'SUSPENDED', 'ARCHIVED', 'REJECTED'].includes(product.status)) {
    throw new AppError('Product is currently unavailable', 404)
  }

  const sellerInfo = await buildPublicSellerInfo(product.sellerId)
  const result = { ...product, sellerInfo }

  await cacheSet(cacheKey, result, TTL.PRODUCT_DETAIL)
  return result
}

export const getProductBySlug = async (slug: string) => {
  const cacheKey = `product:slug:${slug}`
  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) return cached

  const product = await Product.findOne({ slug: slug.toLowerCase() })
    .populate(
      'sellerId',
      'firstName lastName username email phoneNumber profileImage address createdAt',
    )
    .lean()

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  const sellerInfo = await buildPublicSellerInfo(product.sellerId)
  const result = { ...product, sellerInfo }

  await cacheSet(cacheKey, result, TTL.PRODUCT_DETAIL)
  return result
}

export const searchProducts = async (q: string, filters: Partial<ProductFiltersInput> = {}) => {
  return getProducts({ ...filters, search: q } as ProductFiltersInput)
}

export const getProductsByCategory = async (
  category: string,
  filters: Partial<ProductFiltersInput> = {},
) => {
  return getProducts({ ...filters, category: category as any } as ProductFiltersInput)
}

export const getSellerProducts = async (
  sellerId: string,
  filters: Partial<ProductFiltersInput> = {},
) => {
  return getProducts({ ...filters, sellerId, ignorePublicStatus: true } as any)
}

// ─── Seller: Create product ──────────────────────────────────────────────────
export const createProduct = async (
  param1: string | CreateProductInput,
  param2?: string | CreateProductInput,
) => {
  let sellerId: string
  let input: CreateProductInput

  if (typeof param1 === 'string') {
    sellerId = param1
    input = param2 as CreateProductInput
  } else {
    input = param1
    sellerId = param2 as string
  }

  // Mandatory KYC & Store Gate Check
  if (sellerId && mongoose.isValidObjectId(sellerId)) {
    const profile = await SellerProfile.findOne({ userId: sellerId }).lean()
    if (profile) {
      if (profile.kycStatus !== 'VERIFIED') {
        throw new AppError(
          `Seller KYC Required: Cannot create product before completing KYC verification (Current status: ${profile.kycStatus || 'NOT_STARTED'}). Please verify your account at /seller/onboarding.`,
          403,
        )
      }
      if (!profile.storeCreated && !profile.storeSlug) {
        throw new AppError(
          'Store Required: Cannot create product before completing store setup. Please complete store onboarding at /seller/onboarding.',
          403,
        )
      }
    }
  }

  const existingSku = await Product.findOne({ sku: input.sku.toUpperCase() })
  if (existingSku) {
    throw new AppError(`SKU '${input.sku}' is already in use`, 409)
  }

  const slug =
    input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36)

  const product = await Product.create({
    ...input,
    sku: input.sku.toUpperCase(),
    sellerId: new mongoose.Types.ObjectId(sellerId),
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    slug,
    isActive: true,
  })

  await cacheDelPattern('products:*')

  await eventBus.publish({
    eventType: 'product.created',
    aggregateId: (product._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Product',
    payload: {
      productId: (product._id as mongoose.Types.ObjectId).toString(),
      sku: product.sku,
      title: product.title,
      price: product.price,
      sellerId,
    },
  })

  return product
}

// ─── Seller: Update product ──────────────────────────────────────────────────
export const updateProduct = async (
  productId: string,
  param2: string | UpdateProductInput,
  param3?: string | UpdateProductInput | boolean,
  param4 = false,
) => {
  let sellerId: string
  let input: UpdateProductInput
  let isAdmin = param4

  if (typeof param2 === 'string') {
    sellerId = param2
    input = param3 as UpdateProductInput
  } else {
    input = param2
    sellerId = param3 as string
    if (typeof param4 === 'boolean') isAdmin = param4
  }

  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)

  if (!isAdmin && sellerId && product.sellerId.toString() !== sellerId) {
    throw new AppError('Unauthorized: You do not own this product', 403)
  }

  if (input.sku && input.sku.toUpperCase() !== product.sku) {
    const existing = await Product.findOne({
      sku: input.sku.toUpperCase(),
      _id: { $ne: productId },
    })
    if (existing) throw new AppError(`SKU '${input.sku}' is already in use`, 409)
    product.sku = input.sku.toUpperCase()
  }

  Object.assign(product, input)
  await product.save()

  await cacheDelPattern('products:*')
  await cacheDelPattern(`product:detail:${productId}`)

  await eventBus.publish({
    eventType: 'product.updated',
    aggregateId: productId,
    aggregateType: 'Product',
    payload: { productId, sellerId, status: product.status },
  })

  return product
}

export const setProductStatus = async (
  productId: string,
  targetStatus: ProductLifecycleStatus,
  actorId: string,
  isAdmin = false,
) => {
  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)

  if (!isAdmin && product.sellerId.toString() !== actorId) {
    throw new AppError('Unauthorized: Cannot modify product status', 403)
  }

  product.status = targetStatus
  if (targetStatus === 'PUBLISHED' || targetStatus === 'active') {
    if (!isAdmin && product.sellerId && mongoose.isValidObjectId(product.sellerId)) {
      const profile = await SellerProfile.findOne({ userId: product.sellerId }).lean()
      if (profile) {
        if (profile.kycStatus !== 'VERIFIED') {
          throw new AppError(
            `Seller KYC Required: Cannot publish product before completing KYC verification (Current status: ${profile.kycStatus || 'NOT_STARTED'}).`,
            403,
          )
        }
        if (!profile.storeCreated && !profile.storeSlug) {
          throw new AppError(
            'Store Required: Cannot publish product before completing store setup.',
            403,
          )
        }
      }
    }
    product.publishedAt = new Date()
    product.visibility = 'PUBLIC'
    product.isActive = true
  } else if (targetStatus === 'ARCHIVED') {
    product.archivedAt = new Date()
    product.visibility = 'ARCHIVED'
    product.isActive = false
  } else if (targetStatus === 'SUSPENDED' || targetStatus === 'blocked') {
    product.isActive = false
  }

  await product.save()

  await cacheDelPattern('products:*')
  await cacheDelPattern(`product:detail:${productId}`)

  await eventBus.publish({
    eventType: `product.${targetStatus.toLowerCase()}`,
    aggregateId: productId,
    aggregateType: 'Product',
    payload: { productId, status: targetStatus, actorId },
  })

  return product
}

export const approveProduct = async (productId: string) => {
  return setProductStatus(productId, 'APPROVED', 'admin', true)
}

export const blockProduct = async (productId: string) => {
  return setProductStatus(productId, 'SUSPENDED', 'admin', true)
}

// ─── Categories & Brands ─────────────────────────────────────────────────────
export const createCategory = async (input: {
  name: string
  description?: string
  parentCategoryId?: string
  icon?: string
}) => {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const existing = await Category.findOne({ slug })
  if (existing) throw new AppError(`Category '${input.name}' already exists`, 409)

  const category = (await Category.create({
    name: input.name,
    slug,
    description: input.description,
    parentCategoryId: input.parentCategoryId
      ? new mongoose.Types.ObjectId(input.parentCategoryId)
      : undefined,
    icon: input.icon,
    status: 'ACTIVE',
  })) as ICategoryDocument

  await cacheDelPattern('categories:*')

  await eventBus.publish({
    eventType: 'category.created',
    aggregateId: ((category as any)._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Category',
    payload: {
      categoryId: ((category as any)._id as mongoose.Types.ObjectId).toString(),
      name: category.name,
    },
  })

  return category
}

export const getCategories = async () => {
  const cacheKey = 'categories:tree'
  const cached = await cacheGet<unknown>(cacheKey)
  if (cached) return cached

  const categories = await Category.find({ status: 'ACTIVE' }).lean()
  await cacheSet(cacheKey, categories, TTL.CATEGORY_TREE)
  return categories
}

export const createBrand = async (input: {
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
}) => {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const existing = await Brand.findOne({ slug })
  if (existing) throw new AppError(`Brand '${input.name}' already exists`, 409)

  const brand = await Brand.create({
    name: input.name,
    slug,
    description: input.description,
    logoUrl: input.logoUrl,
    websiteUrl: input.websiteUrl,
    status: 'ACTIVE',
  })

  await cacheDelPattern('brands:*')

  await eventBus.publish({
    eventType: 'brand.created',
    aggregateId: ((brand as any)._id as mongoose.Types.ObjectId).toString(),
    aggregateType: 'Brand',
    payload: {
      brandId: ((brand as any)._id as mongoose.Types.ObjectId).toString(),
      name: brand.name,
    },
  })

  return brand
}

export const getBrands = async (_category?: string) => {
  const cacheKey = 'brands:list'
  const cached = await cacheGet<unknown>(cacheKey)
  if (cached) return cached

  const brands = await Brand.find({ status: 'ACTIVE' }).lean()
  await cacheSet(cacheKey, brands, TTL.BRAND_LIST)
  return brands
}

// ─── Variants & SKUs ─────────────────────────────────────────────────────────
export const createProductVariant = async (
  productId: string,
  sellerId: string,
  input: {
    sku: string
    title: string
    priceOverride?: number
    attributes?: Record<string, string | number | boolean>
    images?: string[]
  },
  isAdmin = false,
) => {
  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)

  if (!isAdmin && product.sellerId.toString() !== sellerId) {
    throw new AppError('Unauthorized: You do not own this product', 403)
  }

  const existingVariant = await ProductVariant.findOne({ sku: input.sku.toUpperCase() })
  if (existingVariant) throw new AppError(`Variant SKU '${input.sku}' is already in use`, 409)

  const variantId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  const variant = await ProductVariant.create({
    variantId,
    productId: new mongoose.Types.ObjectId(productId),
    sku: input.sku.toUpperCase(),
    title: input.title,
    priceOverride: input.priceOverride,
    attributes: input.attributes || {},
    images: input.images || [],
    status: 'ACTIVE',
  })

  await eventBus.publish({
    eventType: 'variant.created',
    aggregateId: variantId,
    aggregateType: 'ProductVariant',
    payload: { productId, variantId, sku: variant.sku },
  })

  return variant
}

export const getProductVariants = async (productId: string) => {
  return ProductVariant.find({
    productId: new mongoose.Types.ObjectId(productId),
    status: 'ACTIVE',
  }).lean()
}

export const deleteProduct = async (productId: string, sellerId: string, isAdmin = false) => {
  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)

  if (!isAdmin && product.sellerId.toString() !== sellerId) {
    throw new AppError('Unauthorized: You do not own this product', 403)
  }

  await Product.findByIdAndDelete(productId)
  await cacheDelPattern('products:*')
  await cacheDelPattern(`product:detail:${productId}`)

  await eventBus.publish({
    eventType: 'product.deleted',
    aggregateId: productId,
    aggregateType: 'Product',
    payload: { productId, sellerId },
  })
}

export const getFeaturedProducts = async (limit = 10) => {
  const cacheKey = `products:featured:${limit}`
  const cached = await cacheGet<IProductDocument[]>(cacheKey)
  if (cached) return cached

  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    status: { $in: ['active', 'PUBLISHED', 'APPROVED'] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-__v')
    .populate('sellerId', 'firstName lastName name storeName email')
    .lean()

  await cacheSet(cacheKey, products, TTL.FEATURED)
  return products
}

export const getTrendingProducts = async (limit = 12) => {
  return getProducts({ limit, sort: 'popular' } as ProductFiltersInput).then((r) => r.products)
}

export const getRecommendedProducts = async (limit = 12) => {
  return getFeaturedProducts(limit)
}

export const getRelatedProducts = async (productId: string, limit = 8) => {
  const current = await Product.findById(productId)
  if (!current) return []
  return getProducts({ category: current.category, limit } as ProductFiltersInput).then(
    (r) => r.products,
  )
}

export const getSearchSuggestions = async (q: string) => {
  if (!q.trim()) return []
  const products = await Product.find({
    title: new RegExp(escRegex(q), 'i'),
    isActive: true,
  })
    .limit(5)
    .select('title category')
    .lean()
  return products.map((p) => p.title)
}

export const incrementViews = async (productId: string) => {
  await cacheIncr(`product:views:${productId}`)
  await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } })
}

export const flushViewCounters = async () => {}
