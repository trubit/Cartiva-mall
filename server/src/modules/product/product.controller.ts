import { unlink } from 'fs/promises'
import type { Request, Response, NextFunction } from 'express'
import {
  getProducts,
  getProductById,
  searchProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  approveProduct,
  blockProduct,
  getSellerProducts,
  getFeaturedProducts,
  getTrendingProducts,
  getRecommendedProducts,
  getRelatedProducts,
  getCategories,
  getBrands,
  getSearchSuggestions,
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

export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? ''
    const filters = req.query as unknown as ProductFiltersInput
    const result = await searchProducts(q, filters)
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
    const result = await getProductsByCategory(category, filters)
    sendSuccess(res, result.products, 'Category products fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

// ─── Seller ────────────────────────────────────────────────────────────────────
export const myProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = req.query as unknown as ProductFiltersInput
    const result = await getSellerProducts(req.user!.userId, filters)
    sendSuccess(res, result.products, 'Your products', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await createProduct(req.body, req.user!.userId)
    sendCreated(res, product, 'Product created — pending approval')
  } catch (err) {
    next(err)
  }
}

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const product = await updateProduct(
      req.params['id'] as string,
      req.body,
      req.user!.userId,
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
      // Always clean up temp files whether the Cloudinary upload succeeded or failed.
      await Promise.allSettled(files.map((f) => unlink(f.path)))
    }
    sendSuccess(res, { urls: uploads.map((u) => u.url) }, 'Images uploaded')
  } catch (err) {
    next(err)
  }
}

// ─── Discovery ────────────────────────────────────────────────────────────────
export const trendingProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? '12', 10) || 12))
    const products = await getTrendingProducts(limit)
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
    const products = await getRecommendedProducts(limit)
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
    const products = await getRelatedProducts(req.params['id'] as string, limit)
    sendSuccess(res, products, 'Related products')
  } catch (err) {
    next(err)
  }
}

export const listCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await getCategories()
    sendSuccess(res, categories, 'Categories fetched')
  } catch (err) {
    next(err)
  }
}

export const listBrands = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = req.query.category as string | undefined
    const brands = await getBrands(category)
    sendSuccess(res, brands, 'Brands fetched')
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
    const suggestions = await getSearchSuggestions(q)
    sendSuccess(res, suggestions, 'Suggestions')
  } catch (err) {
    next(err)
  }
}

// ─── Admin ─────────────────────────────────────────────────────────────────────
export const approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await approveProduct(req.params['id'] as string)
    sendSuccess(res, product, 'Product approved')
  } catch (err) {
    next(err)
  }
}

export const block = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await blockProduct(req.params['id'] as string)
    sendSuccess(res, product, 'Product blocked')
  } catch (err) {
    next(err)
  }
}
