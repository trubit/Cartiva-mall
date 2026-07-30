import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiShoppingBag, FiTruck, FiRefreshCw, FiShield } from 'react-icons/fi'
import { useFeaturedProducts } from '../../hooks/useProducts.js'
import ProductCarousel from '../../components/product/ProductCarousel/index.js'
import ProductSearch from '../../components/product/ProductSearch/index.js'
import QuickViewModal from '../../components/product/QuickViewModal/index.js'
import { PRODUCT_CATEGORIES } from '../../../shared/constants/index.js'
import type { IProduct } from '../../../shared/types/product.types.js'
import Logo from '../../components/ui/Logo/index.js'

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: '💻',
  'Clothing & Fashion': '👗',
  'Home & Garden': '🏡',
  'Sports & Outdoors': '⚽',
  'Books & Media': '📚',
  'Health & Beauty': '💄',
  'Toys & Games': '🎮',
  Automotive: '🚗',
  'Food & Grocery': '🛒',
  'Jewelry & Accessories': '💍',
}

const PERKS = [
  {
    icon: <FiShield />,
    title: 'Verified Sellers',
    desc: 'Every seller is verified for your safety',
  },
  { icon: <FiTruck />, title: 'Fast Delivery', desc: 'Get orders delivered quickly to your door' },
  { icon: <FiRefreshCw />, title: 'Easy Returns', desc: '30-day hassle-free return policy' },
  { icon: <FiShield />, title: 'Secure Payments', desc: 'End-to-end encrypted checkout' },
]

export default function HomePage() {
  const { data: featured = [], isLoading } = useFeaturedProducts(16)
  const [quickViewProduct, setQuickViewProduct] = useState<IProduct | null>(null)

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-banner">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <Logo size="lg" theme="dark" />
            </div>
            <span className="hero-banner__tagline">Trusted · Fast · Secure</span>

            <h1 className="hero-banner__title">Shop Smarter. Live Better.</h1>

            <p className="hero-banner__subtitle">
              Discover thousands of products from verified sellers. Great deals, fast delivery, easy
              returns.
            </p>

            {/* Standalone search */}
            <div style={{ maxWidth: 560, marginBottom: 'var(--space-6)' }}>
              <ProductSearch placeholder="Search products, brands, categories…" />
            </div>

            <div className="hero-banner__actions">
              <Link to="/products" className="hero-btn-primary">
                <FiShoppingBag size={16} />
                Shop Now
              </Link>
              <Link to="/register" className="hero-btn-secondary">
                Become a Seller <FiArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category strip ───────────────────────────────────── */}
      <section
        style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-neutral-200)',
          padding: '0.875rem 0',
        }}
      >
        <div className="container">
          <div className="category-chips">
            {PRODUCT_CATEGORIES.map((cat) => (
              <Link key={cat} to={`/category/${encodeURIComponent(cat)}`} className="category-chip">
                {CATEGORY_ICONS[cat]} {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Today's Deals banner ─────────────────────────────── */}
      <div
        style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '0.5rem 0' }}
      >
        <div
          className="container"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}
        >
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#856404' }}>
            ⚡ Today's Deals
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: '#856404' }}>
            Limited-time offers — while supplies last
          </span>
          <Link
            to="/products?isFeatured=true"
            style={{
              marginLeft: 'auto',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-link)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            See all deals <FiArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── Featured Products ─────────────────────────────────── */}
      {(isLoading || featured.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-brand-bg)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label">Top Picks</div>
                <h2 className="section-hd__title">Featured Products</h2>
              </div>
              <Link to="/products?isFeatured=true" className="section-hd__link">
                See all <FiArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="products-skeleton" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-img" />
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line skeleton-line--med" />
                  </div>
                ))}
              </div>
            ) : (
              <ProductCarousel products={featured} onQuickView={setQuickViewProduct} />
            )}
          </div>
        </section>
      )}

      {/* ── Shop by Category ────────────────────────────────── */}
      <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
        <div className="container">
          <div className="section-hd">
            <div>
              <div className="section-hd__label">Browse</div>
              <h2 className="section-hd__title">Shop by Category</h2>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {PRODUCT_CATEGORIES.map((cat) => (
              <Link key={cat} to={`/category/${encodeURIComponent(cat)}`} className="category-card">
                <div className="category-card__icon">{CATEGORY_ICONS[cat]}</div>
                <div className="category-card__name">{cat}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Shop With Us ────────────────────────────────── */}
      <section className="section section--sm" style={{ background: 'var(--color-brand-bg)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {PERKS.map(({ icon, title, desc }) => (
              <div key={title} className="perk-card">
                <div className="perk-card__icon">{icon}</div>
                <div>
                  <div className="perk-card__title">{title}</div>
                  <div className="perk-card__desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────── */}
      <section style={{ background: 'var(--color-navbar-bg)', padding: 'var(--space-10) 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2
            style={{
              color: '#fff',
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              marginBottom: 'var(--space-2)',
            }}
          >
            Start Selling on Cartiva
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.7)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-6)',
              maxWidth: 440,
              margin: '0 auto var(--space-6)',
            }}
          >
            Reach millions of buyers. List your products today and grow your business.
          </p>
          <Link to="/register" className="hero-btn-primary">
            Create Seller Account <FiArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      )}
    </>
  )
}
