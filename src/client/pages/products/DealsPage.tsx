import { Link } from 'react-router-dom'
import { FiClock, FiTag } from 'react-icons/fi'
import { useActivePromotions } from '../../hooks/usePromotions.js'
import type { IPromotion } from '../../../shared/types/promotion.types.js'
import type { IProduct } from '../../../shared/types/product.types.js'
import { getImageUrl } from '../../utils/image.js'
import PriceTag from '../../components/product/PriceTag/index.js'

function CountdownTimer({ endDate }: { endDate: string }) {
  const end = new Date(endDate).getTime()
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const diff = Math.max(0, end - now)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-xs)', color: '#ef4444', fontWeight: 700 }}>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

function PromotionBanner({ promo }: { promo: IPromotion }) {
  const isFlash = promo.type === 'flash_sale'
  const discountLabel =
    promo.discountType === 'percentage'
      ? `${promo.discountValue}% off`
      : `$${promo.discountValue} off`

  return (
    <div
      style={{
        background: isFlash
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          : 'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-accent) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem 2rem',
        color: '#fff',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {isFlash && <FiClock size={16} />}
          <span style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>{promo.title}</span>
          {promo.badgeLabel && (
            <span
              style={{
                padding: '2px 10px',
                background: 'rgba(255,255,255,0.25)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
              }}
            >
              {promo.badgeLabel}
            </span>
          )}
        </div>
        {promo.description && (
          <p style={{ opacity: 0.9, marginBottom: 12, fontSize: 'var(--text-sm)' }}>
            {promo.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 14px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
            }}
          >
            <FiTag size={12} style={{ marginRight: 5 }} />
            {discountLabel}
          </span>
          {isFlash && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9, fontSize: 'var(--text-sm)' }}>
              Ends in: <CountdownTimer endDate={promo.endDate} />
            </span>
          )}
          {!isFlash && (
            <span style={{ opacity: 0.8, fontSize: 'var(--text-xs)' }}>
              Until {new Date(promo.endDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function PromotionProducts({ promo }: { promo: IPromotion }) {
  const products = (promo.products as unknown as IProduct[]).filter(
    (p): p is IProduct => typeof p === 'object' && !!p._id,
  )
  if (products.length === 0) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}
    >
      {products.map((p) => {
        const discountedPrice =
          promo.discountType === 'percentage'
            ? p.price * (1 - promo.discountValue / 100)
            : Math.max(0, p.price - promo.discountValue)

        return (
          <Link
            key={p._id}
            to={`/products/${p._id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-neutral-200)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                transition: 'box-shadow 0.15s',
              }}
            >
              {getImageUrl(p.images[0]) && (
                <img
                  src={getImageUrl(p.images[0])}
                  alt={p.title}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                />
              )}
              <div style={{ padding: '0.75rem' }}>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    marginBottom: 6,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {p.title}
                </div>
                <PriceTag price={p.price} discountPrice={discountedPrice} size="sm" showSave />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default function DealsPage() {
  const { data: promotions = [], isLoading } = useActivePromotions()

  return (
    <div className="container section">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: 'var(--text-3xl)', marginBottom: 8 }}>
          Deals & Promotions
        </h1>
        <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
          Exclusive offers updated daily — don't miss out!
        </p>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 140, borderRadius: 'var(--radius-xl)' }}
            />
          ))}
        </div>
      )}

      {!isLoading && promotions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-neutral-400)' }}>
          <FiTag size={48} style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          <p>No active promotions right now. Check back soon!</p>
          <Link
            to="/products"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              color: 'var(--color-brand-accent)',
              fontWeight: 600,
            }}
          >
            Browse all products →
          </Link>
        </div>
      )}

      {promotions.map((promo) => (
        <div key={promo._id}>
          <PromotionBanner promo={promo} />
          <PromotionProducts promo={promo} />
        </div>
      ))}
    </div>
  )
}
