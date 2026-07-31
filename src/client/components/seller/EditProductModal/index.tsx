import { useEffect, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { FiEdit3 } from 'react-icons/fi'
import { useUpdateProduct } from '../../../hooks/useProducts.js'
import { PRODUCT_CATEGORIES } from '../../../../shared/constants/index.js'
import { useQueryClient } from '@tanstack/react-query'
import { SELLER_PRODUCTS } from '../../../hooks/useSeller.js'
import ProductImageUploader from '../../product/ProductImageUploader/index.js'
import type { IProduct } from '../../../../shared/types/index.js'

interface EditProductModalProps {
  product: IProduct | null
  onHide: () => void
}

export default function EditProductModal({ product, onHide }: EditProductModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    discountPrice: '',
    category: PRODUCT_CATEGORIES[0] as string,
    brand: '',
    sku: '',
    stockQuantity: '1',
    isFeatured: false,
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const { mutate, isPending, error, reset: resetMutation } = useUpdateProduct()
  const qc = useQueryClient()

  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        title: product.title,
        description: product.description,
        price: String(product.price),
        discountPrice: product.discountPrice ? String(product.discountPrice) : '',
        category: product.category,
        brand: product.brand ?? '',
        sku: product.sku,
        stockQuantity: String(product.stockQuantity),
        isFeatured: product.isFeatured,
      })
      setImageUrls(product.images ?? [])
      resetMutation()
    }
  }, [product, resetMutation])

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    mutate(
      {
        id: product._id,
        data: {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
          category: form.category,
          brand: form.brand || undefined,
          sku: form.sku.toUpperCase(),
          stockQuantity: Number(form.stockQuantity),
          isFeatured: form.isFeatured,
          images: imageUrls,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: SELLER_PRODUCTS })
          onHide()
        },
      },
    )
  }

  return (
    <Modal show={!!product} onHide={onHide} centered size="lg" className="pm-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="pm-modal__title-icon" aria-hidden="true">
            <FiEdit3 size={14} />
          </span>
          Edit Product
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <div className="pm-alert pm-alert--error" role="alert">
            {(error as Error).message}
          </div>
        )}

        <Form id="edit-product-modal-form" onSubmit={handleSubmit} noValidate>
          {/* ── Product Details ─────────────────────────────────── */}
          <div className="pm-section">
            <p className="pm-section-label">Product Details</p>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group controlId="ep-title">
                  <Form.Label>
                    Product Title <span style={{ color: 'var(--pm-danger-text)' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="ep-desc">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* ── Product Images ───────────────────────────────────── */}
          <div className="pm-section">
            <p className="pm-section-label">Product Images</p>
            <ProductImageUploader value={imageUrls} onChange={setImageUrls} maxImages={6} />
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--pm-modal-text-muted)',
                marginTop: '0.5rem',
                marginBottom: 0,
              }}
            >
              First image is the main thumbnail · JPEG, PNG, WebP · max 5 MB each
            </p>
          </div>

          {/* ── Pricing & Inventory ──────────────────────────────── */}
          <div className="pm-section">
            <p className="pm-section-label">Pricing & Inventory</p>
            <Row className="g-3">
              <Col xs={6} md={4}>
                <Form.Group controlId="ep-price">
                  <Form.Label>
                    Price ($) <span style={{ color: 'var(--pm-danger-text)' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={4}>
                <Form.Group controlId="ep-discount">
                  <Form.Label>Discount Price ($)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountPrice}
                    onChange={(e) => set('discountPrice', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={4}>
                <Form.Group controlId="ep-stock">
                  <Form.Label>
                    Stock Qty <span style={{ color: 'var(--pm-danger-text)' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(e) => set('stockQuantity', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* ── Catalog Info ─────────────────────────────────────── */}
          <div className="pm-section">
            <p className="pm-section-label">Catalog</p>
            <Row className="g-3">
              <Col xs={6}>
                <Form.Group controlId="ep-category">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="ep-brand">
                  <Form.Label>Brand</Form.Label>
                  <Form.Control value={form.brand} onChange={(e) => set('brand', e.target.value)} />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="ep-sku">
                  <Form.Label>SKU</Form.Label>
                  <Form.Control
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value.toUpperCase())}
                    style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                  />
                </Form.Group>
              </Col>
              <Col xs={6} className="d-flex align-items-end pb-1">
                <Form.Check
                  id="ep-featured"
                  type="checkbox"
                  label="Mark as Featured"
                  checked={form.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)}
                />
              </Col>
            </Row>
          </div>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="pm-btn pm-btn--cancel"
          onClick={onHide}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="edit-product-modal-form"
          className="pm-btn pm-btn--submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="pm-spinner" /> Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
