import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FiHome,
  FiChevronRight,
  FiGrid,
  FiArrowRight,
  FiStar,
  FiZap,
  FiTruck,
} from 'react-icons/fi'
import { useCategoryProducts } from '../../hooks/useProducts.js'
import { useProductStore } from '../../store/productStore.js'
import ProductGrid from '../../components/product/ProductGrid/index.js'
import ProductFilter from '../../components/product/ProductFilter/index.js'
import QuickViewModal from '../../components/product/QuickViewModal/index.js'
import { PRODUCT_CATEGORIES } from '../../../shared/constants/index.js'
import { useT } from '../../i18n/useT.js'
import type { IProduct } from '../../../shared/types/product.types.js'

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

/* Aurora colors per category: base, glow1, glow2, glow3, accent (for icon glow + stats + CTA) */
const CATEGORY_THEME: Record<
  string,
  {
    base: string
    glow1: string
    glow2: string
    glow3: string
    accent: string
  }
> = {
  Electronics: {
    base: '#030b1a',
    glow1: 'rgba(14,165,233,.55)',
    glow2: 'rgba(59,130,246,.4)',
    glow3: 'rgba(99,102,241,.3)',
    accent: 'rgba(56,189,248,.9)',
  },
  'Clothing & Fashion': {
    base: '#1a0320',
    glow1: 'rgba(168,85,247,.5)',
    glow2: 'rgba(236,72,153,.4)',
    glow3: 'rgba(244,114,182,.3)',
    accent: 'rgba(232,121,249,.9)',
  },
  'Home & Garden': {
    base: '#031208',
    glow1: 'rgba(34,197,94,.5)',
    glow2: 'rgba(74,222,128,.35)',
    glow3: 'rgba(132,204,22,.3)',
    accent: 'rgba(74,222,128,.9)',
  },
  'Sports & Outdoors': {
    base: '#130a00',
    glow1: 'rgba(251,146,60,.5)',
    glow2: 'rgba(245,158,11,.4)',
    glow3: 'rgba(234,179,8,.3)',
    accent: 'rgba(251,191,36,.95)',
  },
  'Books & Media': {
    base: '#0c0520',
    glow1: 'rgba(124,58,237,.55)',
    glow2: 'rgba(139,92,246,.4)',
    glow3: 'rgba(167,139,250,.3)',
    accent: 'rgba(167,139,250,.9)',
  },
  'Health & Beauty': {
    base: '#1a0310',
    glow1: 'rgba(244,63,94,.5)',
    glow2: 'rgba(251,113,133,.4)',
    glow3: 'rgba(253,164,175,.3)',
    accent: 'rgba(251,113,133,.95)',
  },
  'Toys & Games': {
    base: '#001518',
    glow1: 'rgba(6,182,212,.5)',
    glow2: 'rgba(34,211,238,.4)',
    glow3: 'rgba(94,234,212,.3)',
    accent: 'rgba(34,211,238,.9)',
  },
  Automotive: {
    base: '#0a0d12',
    glow1: 'rgba(71,85,105,.6)',
    glow2: 'rgba(100,116,139,.45)',
    glow3: 'rgba(148,163,184,.3)',
    accent: 'rgba(148,163,184,.9)',
  },
  'Food & Grocery': {
    base: '#150500',
    glow1: 'rgba(234,88,12,.55)',
    glow2: 'rgba(249,115,22,.4)',
    glow3: 'rgba(251,146,60,.3)',
    accent: 'rgba(251,146,60,.95)',
  },
  'Jewelry & Accessories': {
    base: '#120c00',
    glow1: 'rgba(202,138,4,.55)',
    glow2: 'rgba(234,179,8,.4)',
    glow3: 'rgba(250,204,21,.3)',
    accent: 'rgba(250,204,21,.95)',
  },
}

const DEFAULT_THEME = {
  base: '#060b14',
  glow1: 'rgba(14,165,233,.5)',
  glow2: 'rgba(99,102,241,.4)',
  glow3: 'rgba(14,165,233,.3)',
  accent: 'rgba(96,165,250,.9)',
}

/* Randomised sparkle positions */
const SPARKS = [
  { top: '12%', left: '8%', op: 0.8, dur: '3.2s', delay: '0s' },
  { top: '20%', left: '88%', op: 0.6, dur: '4.1s', delay: '1.2s' },
  { top: '70%', left: '6%', op: 0.5, dur: '3.8s', delay: '0.6s' },
  { top: '80%', left: '82%', op: 0.7, dur: '2.9s', delay: '2s' },
  { top: '45%', left: '92%', op: 0.4, dur: '5s', delay: '0.3s' },
  { top: '35%', left: '4%', op: 0.5, dur: '4.5s', delay: '1.5s' },
  { top: '88%', left: '40%', op: 0.3, dur: '3.5s', delay: '0.9s' },
  { top: '10%', left: '55%', op: 0.6, dur: '4.2s', delay: '1.8s' },
  { top: '60%', left: '50%', op: 0.2, dur: '6s', delay: '2.5s' },
  { top: '5%', left: '30%', op: 0.5, dur: '3.6s', delay: '0.4s' },
]

export default function CategoryPage() {
  const { category = '' } = useParams<{ category: string }>()
  const cat = decodeURIComponent(category)
  const { filters, setFilters } = useProductStore()
  const { data, isLoading } = useCategoryProducts(cat, filters)
  const t = useT()
  const [quickView, setQuickView] = useState<IProduct | null>(null)

  const products = data?.data ?? []
  const pagination = data?.pagination
  const theme = CATEGORY_THEME[cat] ?? DEFAULT_THEME

  const isValidCategory = PRODUCT_CATEGORIES.includes(cat as (typeof PRODUCT_CATEGORIES)[number])

  if (!isValidCategory) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <h2>Category not found</h2>
        <Link to="/products" style={{ color: 'var(--color-brand-accent)' }}>
          Browse all products
        </Link>
      </div>
    )
  }

  const handlePage = (page: number) => {
    setFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cssVars = {
    '--cat-base': theme.base,
    '--cat-glow1': theme.glow1,
    '--cat-glow2': theme.glow2,
    '--cat-glow3': theme.glow3,
    '--cat-accent': theme.accent,
  } as React.CSSProperties

  return (
    <div>
      {/* ══════════════════ PROMAX HERO ══════════════════════════ */}
      <div className="cat-hero" style={cssVars}>
        {/* Dot-grid overlay */}
        <div className="cat-hero__grid-overlay" />

        {/* Floating blob shapes */}
        <div className="cat-hero__shape cat-hero__shape--1" style={{ background: theme.glow1 }} />
        <div className="cat-hero__shape cat-hero__shape--2" style={{ background: theme.glow2 }} />
        <div className="cat-hero__shape cat-hero__shape--3" style={{ background: theme.glow3 }} />
        <div className="cat-hero__shape cat-hero__shape--4" style={{ background: theme.glow1 }} />

        {/* Sparkle stars */}
        <div className="cat-hero__sparks" aria-hidden="true">
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="cat-hero__spark"
              style={
                {
                  top: s.top,
                  left: s.left,
                  '--op': s.op,
                  '--dur': s.dur,
                  '--delay': s.delay,
                } as React.CSSProperties
              }
            />
          ))}
          {/* Cross sparkles */}
          {[
            { top: '18%', left: '22%', size: 14 },
            { top: '75%', left: '70%', size: 10 },
            { top: '40%', left: '78%', size: 12 },
            { top: '62%', left: '16%', size: 8 },
          ].map((s, i) => (
            <svg
              key={`cross-${i}`}
              style={{
                position: 'absolute',
                top: s.top,
                left: s.left,
                opacity: 0.25,
                animation: `cat-sparkle ${3 + i}s ease-in-out infinite ${i * 0.8}s`,
              }}
              width={s.size}
              height={s.size}
              viewBox="0 0 16 16"
              fill="none"
            >
              <path d="M8 0v16M0 8h16" stroke="white" strokeWidth="1.5" />
              <path
                d="M2.34 2.34l11.32 11.32M13.66 2.34L2.34 13.66"
                stroke="white"
                strokeWidth="0.8"
                opacity="0.5"
              />
            </svg>
          ))}
        </div>

        {/* ── Glass Card ───────────────────────────────────────── */}
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="cat-hero__card">
            {/* Icon with glow, rings, orb */}
            <div className="cat-hero__icon-wrap">
              <div className="cat-hero__icon-glow" />
              <div className="cat-hero__icon-ring cat-hero__icon-ring--1" />
              <div className="cat-hero__icon-ring cat-hero__icon-ring--2" />
              <div className="cat-hero__icon-ring cat-hero__icon-ring--3" />
              <div className="cat-hero__icon-orb">
                <span className="cat-hero__icon">{CATEGORY_ICONS[cat]}</span>
              </div>
            </div>

            {/* Title + underline */}
            <div>
              <h1 className="cat-hero__title">{cat}</h1>
              <span className="cat-hero__title-line" />
            </div>

            {/* Stats */}
            <div className="cat-hero__stats">
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-icon">
                  <FiZap />
                </span>
                <span className="cat-hero__stat-value">
                  {isLoading ? '—' : (pagination?.total ?? products.length).toLocaleString()}
                </span>
                <span className="cat-hero__stat-label">Products</span>
              </div>
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-icon">
                  <FiStar />
                </span>
                <span className="cat-hero__stat-value">4.8+</span>
                <span className="cat-hero__stat-label">Avg Rating</span>
              </div>
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-icon">
                  <FiTruck />
                </span>
                <span className="cat-hero__stat-value">Fast</span>
                <span className="cat-hero__stat-label">Delivery</span>
              </div>
            </div>

            {/* CTA */}
            <Link to={`/products?category=${encodeURIComponent(cat)}`} className="cat-hero__cta">
              Browse {cat} <FiArrowRight size={14} />
            </Link>
          </div>

          {/* Breadcrumb below card */}
          <nav className="cat-hero__breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="cat-hero__bc-link">
              <FiHome size={12} /> Home
            </Link>
            <FiChevronRight size={10} className="cat-hero__bc-sep" />
            <Link to="/products" className="cat-hero__bc-link">
              Products
            </Link>
            <FiChevronRight size={10} className="cat-hero__bc-sep" />
            <span className="cat-hero__bc-current">{cat}</span>
          </nav>
        </div>
      </div>

      {/* ── Category chips strip ─────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-neutral-200)',
          padding: '0.75rem 0',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--text-xs)',
                color: 'var(--color-neutral-500)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <FiGrid size={12} /> More:
            </span>
            <div className="category-chips" style={{ flex: 1, overflowX: 'auto' }}>
              {PRODUCT_CATEGORIES.filter((c) => c !== cat).map((c) => (
                <Link key={c} to={`/category/${encodeURIComponent(c)}`} className="category-chip">
                  {CATEGORY_ICONS[c]} {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Product listing ──────────────────────────────────── */}
      <div className="container section">
        <div className="products-layout">
          <div className="hide-mobile">
            <ProductFilter />
          </div>

          <div>
            <div className="products-main__header">
              <span className="products-main__count">
                {isLoading
                  ? t.cat_loading
                  : `${(pagination?.total ?? 0).toLocaleString()} ${t.cat_products_in} ${cat}`}
              </span>
              <div className="products-main__sort">
                <span style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
                  {t.cat_sort}
                </span>
                <select
                  value={filters.sort ?? 'newest'}
                  onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}
                >
                  <option value="newest">{t.cat_sort_newest}</option>
                  <option value="price_asc">{t.cat_sort_price_asc}</option>
                  <option value="price_desc">{t.cat_sort_price_desc}</option>
                  <option value="rating">{t.cat_sort_rating}</option>
                  <option value="popular">{t.cat_sort_popular}</option>
                </select>
              </div>
            </div>

            <ProductGrid
              products={products}
              cols={3}
              isLoading={isLoading}
              isEmpty={!isLoading && products.length === 0}
              onQuickView={setQuickView}
            />

            {(pagination?.totalPages ?? 0) > 1 && (
              <nav className="pagination">
                <button
                  className="pagination__btn"
                  onClick={() => handlePage((filters.page ?? 1) - 1)}
                  disabled={!pagination?.hasPrev}
                >
                  ‹
                </button>
                {Array.from({ length: pagination?.totalPages ?? 0 }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`pagination__btn${p === (filters.page ?? 1) ? ' pagination__btn--active' : ''}`}
                    onClick={() => handlePage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="pagination__btn"
                  onClick={() => handlePage((filters.page ?? 1) + 1)}
                  disabled={!pagination?.hasNext}
                >
                  ›
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
