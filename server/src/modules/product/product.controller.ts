import { unlink } from 'fs/promises'
import type { Request, Response, NextFunction } from 'express'
import {
  getProducts,
  getProductById,
  getProductBySlug,
  searchProducts as searchProductsService,
  getProductsByCategory as getProductsByCategoryService,
  getSellerProducts as getSellerProductsService,
  getFeaturedProducts,
  getTrendingProducts as getTrendingProductsService,
  getRecommendedProducts as getRecommendedProductsService,
  getRelatedProducts as getRelatedProductsService,
  getSearchSuggestions as getSearchSuggestionsService,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductStatus,
  approveProduct as approveProductService,
  blockProduct as blockProductService,
  createCategory,
  getCategories,
  createBrand,
  getBrands,
  createProductVariant,
  getProductVariants,
} from './product.service.js'
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.js'
import { uploadImagePath, isCloudinaryConfigured } from '../../config/cloudinary.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type { ProductFiltersInput } from '../../../../src/shared/validators/product.validators.js'
import { ROLES } from '../../../../src/shared/constants/index.js'

// ─── Public ────────────────────────────────────────────────────────────────────
export const listProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = req.query as unknown as ProductFiltersInput
    const result = await getProducts(filters)
    sendSuccess(res, result.products, 'Products fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const featuredProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? '12', 10) || 12))
    const products = await getFeaturedProducts(limit)
    sendSuccess(res, products, 'Featured products')
  } catch (err) {
    next(err)
  }
}

export const trendingProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? '12', 10) || 12))
    const products = await getTrendingProductsService(limit)
    sendSuccess(res, products, 'Trending products')
  } catch (err) {
    next(err)
  }
}

export const recommendedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? '12', 10) || 12))
    const products = await getRecommendedProductsService(limit)
    sendSuccess(res, products, 'Recommended products')
  } catch (err) {
    next(err)
  }
}

export const relatedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt((req.query.limit as string) ?? '8', 10) || 8))
    const products = await getRelatedProductsService(req.params['id'] as string, limit)
    sendSuccess(res, products, 'Related products')
  } catch (err) {
    next(err)
  }
}

export const searchSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? ''
    const suggestions = await getSearchSuggestionsService(q)
    sendSuccess(res, suggestions, 'Suggestions')
  } catch (err) {
    next(err)
  }
}

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const product = await getProductById(req.params['id'] as string)
    sendSuccess(res, product, 'Product fetched')
  } catch (err) {
    next(err)
  }
}

export const getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await getProductBySlug(req.params['slug'] as string)
    sendSuccess(res, product, 'Product fetched by slug')
  } catch (err) {
    next(err)
  }
}

export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? ''
    const filters = req.query as unknown as ProductFiltersInput
    const result = await searchProductsService(q, filters)
    sendSuccess(res, result.products, 'Search results', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const byCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = decodeURIComponent(req.params['category'] as string)
    const filters = req.query as unknown as ProductFiltersInput
    const result = await getProductsByCategoryService(category, filters)
    sendSuccess(res, result.products, 'Category products fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

// ─── Seller & Management ───────────────────────────────────────────────────────
export const myProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = req.query as unknown as ProductFiltersInput
    const result = await getSellerProductsService(req.user!.userId, filters)
    sendSuccess(res, result.products, 'Your products', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await createProduct(req.user!.userId, req.body)
    sendCreated(res, product, 'Product created')
  } catch (err) {
    next(err)
  }
}

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const product = await updateProduct(
      req.params['id'] as string,
      req.user!.userId,
      req.body,
      isAdmin,
    )
    sendSuccess(res, product, 'Product updated')
  } catch (err) {
    next(err)
  }
}

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    await deleteProduct(req.params['id'] as string, req.user!.userId, isAdmin)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

// ─── Lifecycle Operations ────────────────────────────────────────────────────
export const submitForReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const product = await setProductStatus(
      req.params['id'] as string,
      'PENDING_REVIEW',
      req.user!.userId,
      isAdmin,
    )
    sendSuccess(res, product, 'Product submitted for review')
  } catch (err) {
    next(err)
  }
}

export const approve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await approveProductService(req.params['id'] as string)
    sendSuccess(res, product, 'Product approved')
  } catch (err) {
    next(err)
  }
}

export const block = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await blockProductService(req.params['id'] as string)
    sendSuccess(res, product, 'Product blocked')
  } catch (err) {
    next(err)
  }
}

export const reject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await setProductStatus(
      req.params['id'] as string,
      'REJECTED',
      req.user!.userId,
      true,
    )
    sendSuccess(res, product, 'Product rejected')
  } catch (err) {
    next(err)
  }
}

export const publish = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const product = await setProductStatus(
      req.params['id'] as string,
      'PUBLISHED',
      req.user!.userId,
      isAdmin,
    )
    sendSuccess(res, product, 'Product published')
  } catch (err) {
    next(err)
  }
}

export const suspend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await setProductStatus(
      req.params['id'] as string,
      'SUSPENDED',
      req.user!.userId,
      true,
    )
    sendSuccess(res, product, 'Product suspended')
  } catch (err) {
    next(err)
  }
}

export const archive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const product = await setProductStatus(
      req.params['id'] as string,
      'ARCHIVED',
      req.user!.userId,
      isAdmin,
    )
    sendSuccess(res, product, 'Product archived')
  } catch (err) {
    next(err)
  }
}

// ─── Categories & Brands ─────────────────────────────────────────────────────
export const createCategoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await createCategory(req.body)
    sendCreated(res, category, 'Category created')
  } catch (err) {
    next(err)
  }
}

export const listCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await getCategories()
    sendSuccess(res, categories, 'Categories fetched')
  } catch (err) {
    next(err)
  }
}

export const createBrandHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await createBrand(req.body)
    sendCreated(res, brand, 'Brand created')
  } catch (err) {
    next(err)
  }
}

export const listBrands = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await getBrands()
    sendSuccess(res, brands, 'Brands fetched')
  } catch (err) {
    next(err)
  }
}

// ─── Variants & SKUs ─────────────────────────────────────────────────────────
export const createVariantHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const variant = await createProductVariant(
      req.params['id'] as string,
      req.user!.userId,
      req.body,
      isAdmin,
    )
    sendCreated(res, variant, 'Variant created')
  } catch (err) {
    next(err)
  }
}

export const listVariantsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variants = await getProductVariants(req.params['id'] as string)
    sendSuccess(res, variants, 'Variants fetched')
  } catch (err) {
    next(err)
  }
}

// ─── Image Upload ──────────────────────────────────────────────────────────────
export const uploadImages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!isCloudinaryConfigured()) {
      return next(
        new AppError(
          'Image uploads require Cloudinary configuration. Add CLOUDINARY_* keys to .env',
          503,
        ),
      )
    }
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return next(new AppError('No images provided', 400))
    }
    let uploads: Awaited<ReturnType<typeof uploadImagePath>>[] = []
    try {
      uploads = await Promise.all(
        files.map((f) =>
          uploadImagePath(f.path, 'cartiva/products', {
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
          }),
        ),
      )
    } finally {
      await Promise.allSettled(files.map((f) => unlink(f.path)))
    }
    sendSuccess(res, { urls: uploads.map((u) => u.url) }, 'Images uploaded')
  } catch (err) {
    next(err)
  }
}
