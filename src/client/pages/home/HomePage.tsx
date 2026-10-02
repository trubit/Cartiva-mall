import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiShoppingBag,
  FiTruck,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiStar,
  FiZap,
  FiAward,
  FiPackage,
  FiCheck,
  FiLock,
} from 'react-icons/fi'
import {
  useFeaturedProducts,
  useTrendingProducts,
  useRecommendedProducts,
} from '../../hooks/useProducts.js'
import { useActivePromotions } from '../../hooks/usePromotions.js'
import { useHomeRecommendations } from '../../hooks/useRecommendations.js'
import { useAuthStore } from '../../store/authStore.js'
import ProductCarousel from '../../components/product/ProductCarousel/index.js'
import ProductSearch from '../../components/product/ProductSearch/index.js'
import QuickViewModal from '../../components/product/QuickViewModal/index.js'
import { PRODUCT_CATEGORIES } from '../../../shared/constants/index.js'
import type { IProduct } from '../../../shared/types/product.types.js'
import Logo from '../../components/ui/Logo/index.js'
import { HUMAN_IMAGES } from '../../constants/images.js'

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
  const { data: trending = [], isLoading: trendingLoading } = useTrendingProducts(12)
  const { data: recommended = [], isLoading: recommendedLoading } = useRecommendedProducts(12)
  const { data: promotions = [] } = useActivePromotions()
  const { data: homeRecs, isLoading: homeRecsLoading } = useHomeRecommendations()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [quickViewProduct, setQuickViewProduct] = useState<IProduct | null>(null)

  const bestSellers = homeRecs?.bestSellers ?? []
  const newArrivals = homeRecs?.newArrivals ?? []
  const personalizedForYou = homeRecs?.personalizedForYou ?? []

  return (
    <>
      {/* ── Full-Bleed Hero ───────────────────────────────────── */}
      <section className="hero-banner hero-banner--fullbleed" aria-label="Welcome to Cartiva Mall">
        {/* Full-bleed background photo layer */}
        <div className="hero-banner__bg-layer" aria-hidden="true">
          <img
            src={HUMAN_IMAGES.homeHeroShopper.url}
            srcSet={`${HUMAN_IMAGES.homeHeroShopper.url.replace('&w=1920', '&w=640')} 640w, ${HUMAN_IMAGES.homeHeroShopper.url.replace('&w=1920', '&w=1024')} 1024w, ${HUMAN_IMAGES.homeHeroShopper.url.replace('&w=1920', '&w=1440')} 1440w, ${HUMAN_IMAGES.homeHeroShopper.url} 1920w`}
            sizes="100vw"
            alt=""
            className="hero-banner__bg-img"
            loading="eager"
            fetchPriority="high"
            width={HUMAN_IMAGES.homeHeroShopper.width}
            height={HUMAN_IMAGES.homeHeroShopper.height}
          />
          <div className="hero-banner__overlay" />
        </div>

        {/* Content container layered over image */}
        <div className="container hero-banner__container">
          {/* Brand & Badge Header Row */}
          <div className="hero-banner__header">
            <Logo size="lg" theme="dark" />
            <div className="hero-banner__tagline">
              <FiShield className="hero-banner__tagline-icon" />
              <span>Trusted &middot; Fast &middot; Secure</span>
            </div>
          </div>

          <div className="hero-banner__content">
            <h1 className="hero-banner__title">
              Shop Smarter.
              <span className="hero-banner__title-accent">Live Better.</span>
            </h1>

            <p className="hero-banner__subtitle">
              Discover thousands of products from verified sellers. Great deals, fast delivery, easy
              returns, and zero-risk buyer escrow protection.
            </p>

            {/* Real Search component with suggestions & route integration */}
            <div className="hero-banner__search-wrap">
              <ProductSearch placeholder="Search products, brands, categories…" />
            </div>

            {/* Real CTAs connected to platform routes */}
            <div className="hero-banner__actions">
              <Link to="/products" className="hero-btn-primary" id="hero-shop-now-btn">
                <FiShoppingBag size={18} />
                <span>Shop Now</span>
              </Link>
              <Link
                to={isAuthenticated ? '/seller/register' : '/register'}
                className="hero-btn-secondary"
                id="hero-become-seller-btn"
              >
                <span>Become a Seller</span>
                <FiArrowRight size={16} />
              </Link>
            </div>

            {/* Honest Trust Assurance (No fabricated metrics) */}
            <div className="hero-banner__trust-pill">
              <div className="hero-banner__trust-item">
                <FiCheck className="hero-banner__trust-check" />
                <span>Buyer Escrow Guarantee</span>
              </div>
              <span className="hero-banner__trust-divider" aria-hidden="true">
                &bull;
              </span>
              <div className="hero-banner__trust-item">
                <FiCheck className="hero-banner__trust-check" />
                <span>100% Verified Sellers</span>
              </div>
              <span className="hero-banner__trust-divider" aria-hidden="true">
                &bull;
              </span>
              <div className="hero-banner__trust-item">
                <FiLock className="hero-banner__trust-check" />
                <span>PCI-DSS Encrypted Payments</span>
              </div>
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

      {/* ── Active promotion banners ──────────────────────────── */}
      {promotions.length > 0 && (
        <section style={{ padding: '1rem 0', background: 'var(--color-brand-bg)' }}>
          <div className="container">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {promotions.slice(0, 2).map((promo) => (
                <Link key={promo._id} to="/deals" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      background:
                        promo.type === 'flash_sale'
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-accent) 100%)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.875rem 1.25rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <FiZap size={20} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        {promo.title}
                      </div>
                      {promo.description && (
                        <div style={{ opacity: 0.85, fontSize: 'var(--text-xs)', marginTop: 2 }}>
                          {promo.description}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        padding: '3px 12px',
                        background: 'rgba(255,255,255,0.25)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {promo.discountType === 'percentage'
                        ? `${promo.discountValue}% off`
                        : `$${promo.discountValue} off`}
                    </span>
                    <FiArrowRight size={14} style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            to="/deals"
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

      {/* ── Trending Products ─────────────────────────────── */}
      {(trendingLoading || trending.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: '#e53e3e' }}>
                  <FiTrendingUp size={12} style={{ marginRight: 4 }} />
                  Hot Right Now
                </div>
                <h2 className="section-hd__title">Trending Products</h2>
              </div>
              <Link to="/products?sort=popular" className="section-hd__link">
                See all <FiArrowRight size={13} />
              </Link>
            </div>

            {trendingLoading ? (
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
              <ProductCarousel products={trending} onQuickView={setQuickViewProduct} />
            )}
          </div>
        </section>
      )}

      {/* ── Recommended For You ───────────────────────────── */}
      {(recommendedLoading || recommended.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-brand-bg)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: 'var(--color-brand-accent)' }}>
                  <FiStar size={12} style={{ marginRight: 4 }} />
                  Picked For You
                </div>
                <h2 className="section-hd__title">Recommended</h2>
              </div>
              <Link to="/products?sort=rating" className="section-hd__link">
                See all <FiArrowRight size={13} />
              </Link>
            </div>

            {recommendedLoading ? (
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
              <ProductCarousel products={recommended} onQuickView={setQuickViewProduct} />
            )}
          </div>
        </section>
      )}

      {/* ── Best Sellers ──────────────────────────────────── */}
      {(homeRecsLoading || bestSellers.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: '#b45309' }}>
                  <FiAward size={12} style={{ marginRight: 4 }} />
                  Most Popular
                </div>
                <h2 className="section-hd__title">Best Sellers</h2>
              </div>
              <Link to="/products?sort=popular" className="section-hd__link">
                See all <FiArrowRight size={13} />
              </Link>
            </div>
            {homeRecsLoading ? (
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
              <ProductCarousel products={bestSellers} onQuickView={setQuickViewProduct} />
            )}
          </div>
        </section>
      )}

      {/* ── New Arrivals ───────────────────────────────────── */}
      {(homeRecsLoading || newArrivals.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-brand-bg)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: '#0891b2' }}>
                  <FiPackage size={12} style={{ marginRight: 4 }} />
                  Just Landed
                </div>
                <h2 className="section-hd__title">New Arrivals</h2>
              </div>
              <Link to="/products?sort=newest" className="section-hd__link">
                See all <FiArrowRight size={13} />
              </Link>
            </div>
            {homeRecsLoading ? (
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
              <ProductCarousel products={newArrivals} onQuickView={setQuickViewProduct} />
            )}
          </div>
        </section>
      )}

      {/* ── Personalized For You (authenticated users only) ── */}
      {isAuthenticated && (homeRecsLoading || personalizedForYou.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: 'var(--color-brand-accent)' }}>
                  <FiStar size={12} style={{ marginRight: 4 }} />
                  Made For You
                </div>
                <h2 className="section-hd__title">Recommended For You</h2>
              </div>
              <Link to="/products" className="section-hd__link">
                Explore more <FiArrowRight size={13} />
              </Link>
            </div>
            {homeRecsLoading ? (
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
              <ProductCarousel products={personalizedForYou} onQuickView={setQuickViewProduct} />
            )}
          </div>
        </section>
      )}

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
      <section className="seller-cta-section">
        <div className="container">
          <div className="seller-cta-card">
            <div className="seller-cta-visual">
              <img
                src={HUMAN_IMAGES.homeSellerMerchant.url}
                alt={HUMAN_IMAGES.homeSellerMerchant.alt}
                className="seller-cta-img"
                loading="lazy"
                width={HUMAN_IMAGES.homeSellerMerchant.width}
                height={HUMAN_IMAGES.homeSellerMerchant.height}
              />
            </div>
            <div className="seller-cta-content">
              <span className="seller-cta-tag">Merchant Community</span>
              <h2
                style={{
                  color: '#fff',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 800,
                  marginBottom: 'var(--space-2)',
                }}
              >
                Grow Your Business on Cartiva
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,.8)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.6,
                  marginBottom: 'var(--space-3)',
                }}
              >
                Join verified independent merchants connecting with active buyers across Nigeria and
                Africa. Enjoy automated payouts, multi-currency pricing, and dedicated vendor
                support.
              </p>

              <ul className="seller-cta-perks">
                <li className="seller-cta-perk-item">
                  <FiCheck style={{ color: '#10b981', flexShrink: 0 }} /> Instant escrow payouts
                  directly to your local bank
                </li>
                <li className="seller-cta-perk-item">
                  <FiCheck style={{ color: '#10b981', flexShrink: 0 }} /> Multi-currency support
                  (NGN, USD, EUR, GBP)
                </li>
                <li className="seller-cta-perk-item">
                  <FiCheck style={{ color: '#10b981', flexShrink: 0 }} /> Comprehensive inventory
                  and analytics dashboard
                </li>
              </ul>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="hero-btn-primary">
                  Create Seller Account <FiArrowRight size={14} />
                </Link>
                <Link to="/seller/onboarding" className="hero-btn-secondary">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      )}
    </>
  )
}
