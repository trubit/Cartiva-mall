import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { FiPlusSquare } from 'react-icons/fi'
import { useCreateProduct } from '../../../hooks/useProducts.js'
import { PRODUCT_CATEGORIES } from '../../../../shared/constants/index.js'
import { useQueryClient } from '@tanstack/react-query'
import { SELLER_PRODUCTS } from '../../../hooks/useSeller.js'
import ProductImageUploader from '../../product/ProductImageUploader/index.js'

interface AddProductModalProps {
  show: boolean
  onHide: () => void
}

const INITIAL = {
  title: '',
  description: '',
  price: '',
  discountPrice: '',
  category: PRODUCT_CATEGORIES[0] as string,
  brand: '',
  sku: '',
  stockQuantity: '1',
  isFeatured: false,
}

export default function AddProductModal({ show, onHide }: AddProductModalProps) {
  const [form, setForm] = useState(INITIAL)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const { mutate, isPending, error } = useCreateProduct()
  const qc = useQueryClient()

  const set = (k: keyof typeof INITIAL, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(
      {
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
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: SELLER_PRODUCTS })
          setForm(INITIAL)
          setImageUrls([])
          onHide()
        },
      },
    )
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="pm-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="pm-modal__title-icon" aria-hidden="true">
            <FiPlusSquare size={14} />
          </span>
          Add New Product
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <div className="pm-alert pm-alert--error" role="alert">
            {(error as Error).message}
          </div>
        )}

        <Form id="add-product-modal-form" onSubmit={handleSubmit} noValidate>
          {/* ── Product Details ─────────────────────────────────── */}
          <div className="pm-section">
            <p className="pm-section-label">Product Details</p>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group controlId="ap-title">
                  <Form.Label>
                    Product Title <span style={{ color: 'var(--pm-danger-text)' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="e.g. Wireless Bluetooth Headphones"
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="ap-desc">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Brief product description…"
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
                <Form.Group controlId="ap-price">
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
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={4}>
                <Form.Group controlId="ap-discount">
                  <Form.Label>Discount Price ($)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountPrice}
                    onChange={(e) => set('discountPrice', e.target.value)}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={4}>
                <Form.Group controlId="ap-stock">
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
                <Form.Group controlId="ap-category">
                  <Form.Label>
                    Category <span style={{ color: 'var(--pm-danger-text)' }}>*</span>
                  </Form.Label>
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
                <Form.Group controlId="ap-brand">
                  <Form.Label>Brand</Form.Label>
                  <Form.Control
                    value={form.brand}
                    onChange={(e) => set('brand', e.target.value)}
                    placeholder="e.g. Sony"
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="ap-sku">
                  <Form.Label>
                    SKU <span style={{ color: 'var(--pm-danger-text)' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value.toUpperCase())}
                    placeholder="e.g. BT-HDPH-001"
                    style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                  />
                </Form.Group>
              </Col>
              <Col xs={6} className="d-flex align-items-end pb-1">
                <Form.Check
                  id="ap-featured"
                  type="checkbox"
                  label="Mark as Featured"
                  checked={form.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)}
                  className="pm-modal-check"
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
          form="add-product-modal-form"
          className="pm-btn pm-btn--submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="pm-spinner" /> Creating…
            </>
          ) : (
            'Create Product'
          )}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
