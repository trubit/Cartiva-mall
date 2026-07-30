import type { IProduct } from '../../../../shared/types/product.types.js'

interface BadgeProps {
  product: Pick<
    IProduct,
    'discountPercent' | 'createdAt' | 'isFeatured' | 'stockQuantity' | 'ratingsCount'
  >
}

const isNew = (createdAt: string) => {
  const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 14
}

const isHot = (ratingsCount: number) => ratingsCount >= 50

export default function ProductBadges({ product }: BadgeProps) {
  const outOfStock = product.stockQuantity === 0
  const discountPct = product.discountPercent ?? 0

  return (
    <div className="product-badges">
      {outOfStock && (
        <span className="badge-product badge-product--out-of-stock">Out of Stock</span>
      )}
      {discountPct > 0 && !outOfStock && (
        <span className="badge-product badge-product--discount">-{discountPct}%</span>
      )}
      {product.isFeatured && !outOfStock && (
        <span className="badge-product badge-product--featured">Featured</span>
      )}
      {isHot(product.ratingsCount) && !outOfStock && (
        <span className="badge-product badge-product--hot">Hot</span>
      )}
      {isNew(product.createdAt) && !outOfStock && !isHot(product.ratingsCount) && (
        <span className="badge-product badge-product--new">New</span>
      )}
    </div>
  )
}
