import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useProduct, useCreateProduct, useUpdateProduct } from '../../hooks/useProducts.js'
import { PRODUCT_CATEGORIES } from '../../../shared/constants/index.js'
import ProductImageUploader from '../../components/product/ProductImageUploader/index.js'

interface ProductFormData {
  title: string
  description: string
  price: number
  discountPrice: string
  category: string
  subCategory: string
  brand: string
  stockQuantity: number
  sku: string
  tags: string
  isFeatured: boolean
}

interface Props {
  mode: 'create' | 'edit'
}

export default function SellerProductForm({ mode }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: existing, isLoading } = useProduct(mode === 'edit' ? (id ?? '') : '')
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()

  const [imageUrls, setImageUrls] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      discountPrice: '',
      category: '',
      subCategory: '',
      brand: '',
      stockQuantity: 0,
      sku: '',
      tags: '',
      isFeatured: false,
    },
  })

  useEffect(() => {
    if (mode === 'edit' && existing) {
      reset({
        title: existing.title,
        description: existing.description,
        price: existing.price,
        discountPrice: existing.discountPrice?.toString() ?? '',
        category: existing.category,
        subCategory: existing.subCategory ?? '',
        brand: existing.brand ?? '',
        stockQuantity: existing.stockQuantity,
        sku: existing.sku,
        tags: existing.tags.join(', '),
        isFeatured: existing.isFeatured,
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageUrls(existing.images ?? [])
    }
  }, [existing, mode, reset])

  const onSubmit = async (data: ProductFormData) => {
    const payload = {
      title: data.title,
      description: data.description,
      price: Number(data.price),
      discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,
      category: data.category,
      subCategory: data.subCategory || undefined,
      brand: data.brand || undefined,
      stockQuantity: Number(data.stockQuantity),
      sku: data.sku,
      tags: data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      images: imageUrls,
      isFeatured: data.isFeatured,
    }

    if (mode === 'create') {
      await createMutation.mutateAsync(payload)
    } else if (id) {
      await updateMutation.mutateAsync({ id, data: payload })
    }

    navigate('/seller/products')
  }

  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending
  const apiError = (createMutation.error ?? updateMutation.error) as Error | null

  if (mode === 'edit' && isLoading) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-2xl)' }} />
      </div>
    )
  }

  return (
    <div className="container section">
      <div className="seller-form__header">
        <button
          className="btn btn-ghost seller-form__back"
          onClick={() => navigate('/seller/products')}
        >
          <FiArrowLeft size={16} /> Back to Products
        </button>
        <h1 className="seller-form__title">
          {mode === 'create' ? 'Add New Product' : 'Edit Product'}
        </h1>
      </div>

      {apiError && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          {apiError.message ?? 'Something went wrong. Please try again.'}
        </div>
      )}

      <form className="seller-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Basic Info */}
        <section className="seller-form__section">
          <h2 className="seller-form__section-title">Basic Information</h2>

          <div className="seller-form__grid">
            <div className="seller-form__field seller-form__field--full">
              <label className="form-label">Title *</label>
              <input
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                placeholder="Product title"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
            </div>

            <div className="seller-form__field seller-form__field--full">
              <label className="form-label">Description *</label>
              <textarea
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                rows={4}
                placeholder="Describe your product…"
                {...register('description', { required: 'Description is required' })}
              />
              {errors.description && (
                <div className="invalid-feedback">{errors.description.message}</div>
              )}
            </div>

            <div className="seller-form__field">
              <label className="form-label">Category *</label>
              <select
                className={`form-control ${errors.category ? 'is-invalid' : ''}`}
                {...register('category', { required: 'Category is required' })}
              >
                <option value="">Select category…</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && <div className="invalid-feedback">{errors.category.message}</div>}
            </div>

            <div className="seller-form__field">
              <label className="form-label">Sub-category</label>
              <input
                className="form-control"
                placeholder="e.g. Smartphones"
                {...register('subCategory')}
              />
            </div>

            <div className="seller-form__field">
              <label className="form-label">Brand</label>
              <input className="form-control" placeholder="e.g. Samsung" {...register('brand')} />
            </div>

            <div className="seller-form__field">
              <label className="form-label">SKU *</label>
              <input
                className={`form-control ${errors.sku ? 'is-invalid' : ''}`}
                placeholder="e.g. PROD-001"
                {...register('sku', { required: 'SKU is required' })}
              />
              {errors.sku && <div className="invalid-feedback">{errors.sku.message}</div>}
            </div>
          </div>
        </section>

        {/* Pricing & Stock */}
        <section className="seller-form__section">
          <h2 className="seller-form__section-title">Pricing & Stock</h2>
          <div className="seller-form__grid">
            <div className="seller-form__field">
              <label className="form-label">Price (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                placeholder="0.00"
                {...register('price', {
                  required: 'Price is required',
                  min: { value: 0, message: 'Must be ≥ 0' },
                })}
              />
              {errors.price && <div className="invalid-feedback">{errors.price.message}</div>}
            </div>

            <div className="seller-form__field">
              <label className="form-label">Sale Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Leave blank for no discount"
                {...register('discountPrice')}
              />
            </div>

            <div className="seller-form__field">
              <label className="form-label">Stock Quantity *</label>
              <input
                type="number"
                min="0"
                className={`form-control ${errors.stockQuantity ? 'is-invalid' : ''}`}
                placeholder="0"
                {...register('stockQuantity', {
                  required: 'Stock is required',
                  min: { value: 0, message: 'Must be ≥ 0' },
                })}
              />
              {errors.stockQuantity && (
                <div className="invalid-feedback">{errors.stockQuantity.message}</div>
              )}
            </div>

            <div className="seller-form__field seller-form__field--checkbox">
              <label className="seller-form__checkbox-label">
                <input type="checkbox" {...register('isFeatured')} />
                <span>Mark as Featured Product</span>
              </label>
            </div>
          </div>
        </section>

        {/* Images & Tags */}
        <section className="seller-form__section">
          <h2 className="seller-form__section-title">Images & Tags</h2>
          <div className="seller-form__grid">
            <div className="seller-form__field seller-form__field--full">
              <label className="form-label">Product Images</label>
              <ProductImageUploader value={imageUrls} onChange={setImageUrls} maxImages={8} />
              <small className="form-text text-muted">
                Upload up to 8 images. The first image is used as the main thumbnail.
              </small>
            </div>

            <div className="seller-form__field seller-form__field--full">
              <label className="form-label">Tags</label>
              <input
                className="form-control"
                placeholder="wireless, bluetooth, earbuds"
                {...register('tags')}
              />
              <small className="form-text text-muted">Separate tags with commas.</small>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="seller-form__actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/seller/products')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isBusy}>
            <FiSave size={16} />
            {isBusy ? 'Saving…' : mode === 'create' ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
