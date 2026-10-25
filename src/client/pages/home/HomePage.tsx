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
  FiSearch,
  FiEye,
  FiShoppingCart,
  FiCreditCard,
  FiHelpCircle,
  FiChevronDown,
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

const JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Discover',
    desc: 'Find what you need by browsing our curated collections or searching specific brands and everyday essentials.',
    icon: <FiSearch />,
    linkText: 'Browse catalogue',
    linkTo: '/products',
  },
  {
    step: '02',
    title: 'Explore',
    desc: 'Inspect transparent item details, authentic ratings, verified specifications, and high-resolution photography.',
    icon: <FiEye />,
    linkText: 'View top picks',
    linkTo: '#featured-products',
  },
  {
    step: '03',
    title: 'Add to Cart',
    desc: 'Select your options and quantities, check transparent itemized totals, and review your bag with ease.',
    icon: <FiShoppingCart />,
    linkText: 'View your bag',
    linkTo: '/cart',
  },
  {
    step: '04',
    title: 'Place Your Order',
    desc: 'Check out securely via cards or bank transfer. Your payment is held in escrow until your package arrives.',
    icon: <FiCreditCard />,
    linkText: 'Payment safety',
    linkTo: '/payment',
  },
  {
    step: '05',
    title: 'Track Your Order',
    desc: 'Follow your delivery with real-time status milestones in your dashboard from dispatch to your door.',
    icon: <FiTruck />,
    linkText: 'Track an order',
    linkTo: '/orders',
  },
]

const CONFIDENCE_POLICIES = [
  {
    icon: <FiTruck />,
    title: 'Shipping & Delivery',
    desc: 'Doorstep delivery with tracked dispatch timelines and transparent regional rates across Nigeria.',
    linkTo: '/shipping',
    linkText: 'Shipping rates & guidelines',
  },
  {
    icon: <FiRefreshCw />,
    title: '30-Day Returns Policy',
    desc: 'Hassle-free 30-day return window and prompt refund restoration if an item is not as described.',
    linkTo: '/returns',
    linkText: 'Return policy details',
  },
  {
    icon: <FiShield />,
    title: 'Payment Protection',
    desc: 'Bank-grade SSL tokenization and buyer escrow protection safeguarding every transaction.',
    linkTo: '/payment',
    linkText: 'Payment protection overview',
  },
  {
    icon: <FiHelpCircle />,
    title: 'Customer Care & Help',
    desc: 'Direct merchant messaging and responsive support to resolve any order inquiries quickly.',
    linkTo: '/help',
    linkText: 'Help & support center',
  },
]

const FAQ_ITEMS = [
  {
    q: 'How do I find products on Cartival Mall?',
    a: 'You can use the search bar at the top of the page to search by keyword, brand, or model with instant suggestions. You can also explore our department categories or browse curated highlights like Featured Products and Today’s Deals.',
  },
  {
    q: 'How does placing an order and payment work?',
    a: 'Browse the catalogue, select your desired options and quantity, and click "Add to Cart". Review your items in your bag, click "Proceed to Checkout", provide your shipping address, and complete payment securely via cards or bank transfer. All purchases are backed by buyer escrow protection.',
  },
  {
    q: 'How can I track my shipment once dispatched?',
    a: 'Once your order is confirmed, you can view real-time delivery status under "Your Orders" in your account dashboard. You can track your shipment as it moves from order placement to dispatch and final delivery.',
  },
  {
    q: 'What payment methods are supported on the platform?',
    a: 'We accept debit/credit cards (Mastercard, Visa, Verve) and direct bank transfers processed securely through Paystack with full PCI-DSS encryption and fraud prevention safeguards.',
  },
  {
    q: 'How do I contact customer support or message a merchant?',
    a: 'You can visit our dedicated Help Center at /help for answers to common questions, or message merchants directly using our in-app messaging system for product or order questions.',
  },
  {
    q: 'What happens if an item arrives damaged or not as described?',
    a: 'Every purchase is covered by our 30-day return policy and buyer escrow protection. If an item arrives damaged, defective, or not as described, you can initiate a return or contact support for replacement or immediate balance restoration.',
  },
]

export default function HomePage() {
  const { data: featured = [], isLoading } = useFeaturedProducts(16)
  const { data: trending = [], isLoading: trendingLoading } = useTrendingProducts(12)
  const { data: recommended = [], isLoading: recommendedLoading } = useRecommendedProducts(12)
  const { data: promotions = [] } = useActivePromotions()
  const { data: homeRecs, isLoading: homeRecsLoading } = useHomeRecommendations()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [quickViewProduct, setQuickViewProduct] = useState<IProduct | null>(null)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const bestSellers = homeRecs?.bestSellers ?? []
  const newArrivals = homeRecs?.newArrivals ?? []
  const personalizedForYou = homeRecs?.personalizedForYou ?? []

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index))
  }

  return (
    <>
      {/* ── Section 1: Hero — Full-Bleed High-Impact Visual ── */}
      <section className="hero-banner hero-banner--fullbleed" aria-label="Welcome to Cartival Mall">
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
              <span>Cartival Mall &middot; Verified Marketplace</span>
            </div>
          </div>

          <div className="hero-banner__content">
            <h1 className="hero-banner__title">
              Good finds. Great choices.
              <span className="hero-banner__title-accent">Shopping made easy.</span>
            </h1>

            <p className="hero-banner__subtitle">
              Discover products you love, find what fits your needs, and place your order in a few
              simple steps.
            </p>

            {/* Real Search component with suggestions & route integration */}
            <div className="hero-banner__search-wrap">
              <ProductSearch placeholder="Search genuine products, brands, collections…" />
            </div>

            {/* Real CTAs connected to platform routes */}
            <div className="hero-banner__actions">
              <Link to="/products" className="hero-btn-primary" id="hero-explore-collection-btn">
                <FiShoppingBag size={18} />
                <span>Explore the collection</span>
              </Link>
              <a href="#how-it-works" className="hero-btn-secondary" id="hero-discover-works-btn">
                <span>Discover how it works</span>
                <FiArrowRight size={16} />
              </a>
            </div>

            {/* Honest Trust Assurance */}
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
                <span>Secure Encrypted Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section B: Editorial Shopping Introduction ── */}
      <section className="editorial-intro-section" aria-labelledby="editorial-intro-heading">
        <div className="container">
          <div className="editorial-intro-grid">
            <div className="editorial-intro-content">
              <div className="section-eyebrow">The Cartival Mall Standard</div>
              <h2 id="editorial-intro-heading" className="editorial-intro-title">
                Curated for quality. Delivered with care.
              </h2>
              <p className="editorial-intro-lead">
                Cartival Mall brings together authentic products from verified independent creators
                and regional merchants, backed by transparent pricing, buyer escrow safeguards, and
                dependable doorstep delivery.
              </p>

              <div className="editorial-intro-pillars">
                <div className="editorial-pillar-item">
                  <FiCheck className="editorial-pillar-check" />
                  <div className="editorial-pillar-text">
                    <strong>Authentic Merchant Goods</strong>
                    <span>
                      Verified items sourced directly from reputable independent merchants.
                    </span>
                  </div>
                </div>
                <div className="editorial-pillar-item">
                  <FiCheck className="editorial-pillar-check" />
                  <div className="editorial-pillar-text">
                    <strong>Transparent Multi-Currency Pricing</strong>
                    <span>Clear checkout with zero hidden fees in NGN, USD, EUR, and GBP.</span>
                  </div>
                </div>
                <div className="editorial-pillar-item">
                  <FiCheck className="editorial-pillar-check" />
                  <div className="editorial-pillar-text">
                    <strong>Guaranteed Buyer Escrow</strong>
                    <span>
                      Your payment is held safely until your shipment is inspected and confirmed.
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Link
                  to="/products"
                  className="journey-sequence-link"
                  style={{ fontSize: '1rem', fontWeight: 700 }}
                >
                  <span>Browse all departments</span>
                  <FiArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="editorial-intro-media">
              <div className="editorial-intro-img-frame">
                <img
                  src={HUMAN_IMAGES.homeSellerMerchant.url}
                  alt={HUMAN_IMAGES.homeSellerMerchant.alt}
                  className="editorial-intro-img"
                  loading="lazy"
                  width={HUMAN_IMAGES.homeSellerMerchant.width}
                  height={HUMAN_IMAGES.homeSellerMerchant.height}
                />
              </div>
              <div className="editorial-floating-badge">
                <div className="editorial-floating-badge-icon">
                  <FiAward />
                </div>
                <div className="editorial-floating-badge-text">
                  Direct connection to verified merchants across fashion, tech, and everyday
                  essentials.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section C: How Shopping Works (5-Step Sequence) ── */}
      <section className="journey-section" id="how-it-works" aria-labelledby="journey-heading">
        <div className="container">
          <div className="section-editorial-header">
            <div className="section-eyebrow">5 Simple Steps</div>
            <h2 id="journey-heading">How Shopping Works on Cartival Mall</h2>
            <p>A clear, transparent path from discovery to delivery.</p>
          </div>

          <div className="journey-sequence-grid">
            {JOURNEY_STEPS.map((item) => (
              <div key={item.step} className="journey-sequence-card">
                <div className="journey-sequence-header">
                  <div className="journey-sequence-icon">{item.icon}</div>
                  <span className="journey-sequence-step">{item.step}</span>
                </div>
                <h3 className="journey-sequence-title">{item.title}</h3>
                <p className="journey-sequence-desc">{item.desc}</p>
                {item.linkTo.startsWith('#') ? (
                  <a href={item.linkTo} className="journey-sequence-link">
                    <span>{item.linkText}</span>
                    <FiArrowRight size={14} />
                  </a>
                ) : (
                  <Link to={item.linkTo} className="journey-sequence-link">
                    <span>{item.linkText}</span>
                    <FiArrowRight size={14} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section D: Real Product Discovery ── */}
      {/* Category Rail */}
      <section
        id="categories"
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

      {/* Active Promotion Banners */}
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

      {/* Today's Deals Banner */}
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

      {/* Featured Highlights */}
      {(isLoading || featured.length > 0) && (
        <section
          className="section section--sm"
          id="featured-products"
          style={{ background: 'var(--color-brand-bg)' }}
        >
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label">Top Picks</div>
                <h2 className="section-hd__title">Featured Highlights</h2>
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

      {/* Shop by Category */}
      <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
        <div className="container">
          <div className="section-hd">
            <div>
              <div className="section-hd__label">Browse</div>
              <h2 className="section-hd__title">Shop by Department</h2>
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

      {/* Trending Now */}
      {(trendingLoading || trending.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: '#e53e3e' }}>
                  <FiTrendingUp size={12} style={{ marginRight: 4 }} />
                  Hot Right Now
                </div>
                <h2 className="section-hd__title">Trending Now</h2>
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

      {/* Recommended Picks */}
      {(recommendedLoading || recommended.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-brand-bg)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: 'var(--color-brand-accent)' }}>
                  <FiStar size={12} style={{ marginRight: 4 }} />
                  Curated For You
                </div>
                <h2 className="section-hd__title">Recommended Picks</h2>
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

      {/* Best Sellers */}
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

      {/* New Arrivals */}
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

      {/* Personalized For You (authenticated users only) */}
      {isAuthenticated && (homeRecsLoading || personalizedForYou.length > 0) && (
        <section className="section section--sm" style={{ background: 'var(--color-white)' }}>
          <div className="container">
            <div className="section-hd">
              <div>
                <div className="section-hd__label" style={{ color: 'var(--color-brand-accent)' }}>
                  <FiStar size={12} style={{ marginRight: 4 }} />
                  Made For You
                </div>
                <h2 className="section-hd__title">Personalized Picks</h2>
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

      {/* ── Section E: Brand Confidence & Customer Reassurance ── */}
      <section className="reassurance-section" aria-labelledby="reassurance-heading">
        <div className="container">
          <div className="section-editorial-header">
            <div className="section-eyebrow">Buyer Assurance</div>
            <h2 id="reassurance-heading">Built on Trust & Transparency</h2>
            <p>Clear policies and guaranteed buyer rights protect you on every order.</p>
          </div>

          <div className="reassurance-grid">
            {CONFIDENCE_POLICIES.map((p) => (
              <Link key={p.title} to={p.linkTo} className="reassurance-card">
                <div className="reassurance-card-header">
                  <div className="reassurance-card-icon">{p.icon}</div>
                  <h3 className="reassurance-card-title">{p.title}</h3>
                </div>
                <p className="reassurance-card-desc">{p.desc}</p>
                <div className="reassurance-card-action">
                  <span>{p.linkText}</span>
                  <FiArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section F: Frequently Asked Questions ── */}
      <section className="faq-section" aria-labelledby="faq-heading">
        <div className="container">
          <div className="section-editorial-header">
            <div className="section-eyebrow">Common Inquiries</div>
            <h2 id="faq-heading">Frequently Asked Questions</h2>
            <p>
              Find quick, clear answers about ordering, payment, delivery, and buyer protection.
            </p>
          </div>

          <div className="faq-container">
            <div className="faq-list">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index
                const contentId = `faq-content-${index}`
                const triggerId = `faq-trigger-${index}`

                return (
                  <div key={item.q} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                    <button
                      id={triggerId}
                      className="faq-trigger"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                      aria-controls={contentId}
                      type="button"
                    >
                      <span>{item.q}</span>
                      <FiChevronDown className="faq-icon" aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <div
                        id={contentId}
                        role="region"
                        aria-labelledby={triggerId}
                        className="faq-content"
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Merchant Community Banner (Grow Your Business on Cartival Mall) ── */}
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
                Grow Your Business on Cartival Mall
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

      {/* ── Section G: Strong Final Shopping Invitation ── */}
      <section className="final-invitation-section" aria-labelledby="final-invitation-heading">
        <div className="container">
          <div className="final-invitation-inner">
            <h2 id="final-invitation-heading" className="final-invitation-title">
              Your next great find starts here.
            </h2>
            <p className="final-invitation-desc">
              Explore what's available and find something that works for you.
            </p>
            <div className="final-invitation-buttons">
              <Link to="/products" className="hero-btn-primary" id="final-start-shopping-btn">
                <FiShoppingBag size={18} />
                <span>Start shopping</span>
              </Link>
              <a
                href="#categories"
                className="hero-btn-secondary"
                id="final-browse-departments-btn"
              >
                <span>Browse by Department</span>
                <FiArrowRight size={16} />
              </a>
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
