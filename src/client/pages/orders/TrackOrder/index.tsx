import { useParams, Link } from 'react-router-dom'
import { FiArrowLeft, FiPackage, FiAlertCircle, FiCalendar, FiClock, FiHash } from 'react-icons/fi'
import { useTrackOrder, useOrder } from '../../../hooks/useOrders.js'
import { OrderStatusBadge } from '../../../components/order/OrderStatus/index.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import PremiumTimeline from '../../../components/order/OrderTimeline/index.js'
import PremiumTrackingInfo from '../../../components/order/TrackingInfo/index.js'
import { getImageUrl } from '../../../utils/image.js'

const STATUS_ACCENT: Record<string, string> = {
  pending: '#FF9900',
  confirmed: '#007185',
  processing: '#0066c0',
  shipped: '#8956FF',
  outForDelivery: '#067D62',
  delivered: '#067D62',
  cancelled: '#CC0C39',
  returned: '#CC0C39',
  refunded: '#565959',
}

function TrackSkeleton() {
  return (
    <div className="to-page">
      <div className="to-hero to-hero--loading">
        <div className="container">
          <div className="to-skeleton" style={{ height: 14, width: 100, marginBottom: 20 }} />
          <div className="to-skeleton" style={{ height: 34, width: 380, marginBottom: 10 }} />
          <div className="to-skeleton" style={{ height: 18, width: 220 }} />
        </div>
      </div>
      <div className="container to-body">
        <div className="to-skeleton" style={{ height: 180, marginBottom: 16, borderRadius: 12 }} />
        <div className="to-skeleton" style={{ height: 300, borderRadius: 12 }} />
      </div>
    </div>
  )
}

export default function TrackOrder() {
  const { id } = useParams<{ id: string }>()

  const { data: trackData, isLoading: trackLoading, isError: trackError } = useTrackOrder(id ?? '')
  const { data: order, isLoading: orderLoading } = useOrder(id ?? '')

  if (trackLoading || orderLoading) return <TrackSkeleton />

  if (trackError || !trackData) {
    return (
      <div className="container to-error-wrap">
        <div className="to-error-card">
          <FiAlertCircle size={44} className="to-error-icon" />
          <h2 className="to-error-title">Tracking unavailable</h2>
          <p className="to-error-text">
            We couldn't load tracking information for this order. Please try again later.
          </p>
          <Link to="/orders" className="to-btn to-btn--primary">
            <FiArrowLeft size={14} /> Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const tracking = trackData.tracking ?? { events: [] }
  const accent = STATUS_ACCENT[order?.orderStatus ?? ''] ?? '#232F3E'

  return (
    <div className="to-page">
      {/* ══════════ HERO ══════════ */}
      <div className="to-hero" style={{ '--to-accent': accent } as React.CSSProperties}>
        <div className="to-hero__accent-bar" />
        <div className="container">
          <Link to={`/orders/${id}`} className="to-back">
            <FiArrowLeft size={14} /> Order Details
          </Link>

          <div className="to-hero__body">
            <div className="to-hero__info">
              <h1 className="to-hero__title">
                Track Order
                {order?.orderNumber && <span className="to-hero__num"> #{order.orderNumber}</span>}
              </h1>
              <div className="to-hero__meta">
                {order && <OrderStatusBadge status={order.orderStatus} showIcon />}
                {order && (
                  <span className="to-hero__date">
                    <FiCalendar size={12} />
                    Placed {formatDate(order.createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Live status chip */}
            <div className="to-hero__live">
              <span className="to-live-dot" style={{ background: accent }} />
              <span className="to-live-label">Live Tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="container to-body">
        <div className="to-grid">
          {/* Shipping / carrier card */}
          <div className="to-card to-card--shipping">
            <div className="to-card__head">
              <span className="to-card__dot" style={{ background: accent }} />
              <h2 className="to-card__title">Shipping Details</h2>
            </div>
            <PremiumTrackingInfo tracking={tracking} shippingMethod={trackData.shippingMethod} />
          </div>

          {/* Items being tracked */}
          {order && order.items.length > 0 && (
            <div className="to-card to-card--items">
              <div className="to-card__head">
                <span className="to-card__dot" style={{ background: accent }} />
                <h2 className="to-card__title">
                  <FiPackage size={14} style={{ marginRight: 6 }} />
                  Items in this shipment
                </h2>
                <span className="to-card__count">{order.items.length}</span>
              </div>
              <div className="to-shipment-items">
                {order.items.map((item, i) => (
                  <div className="to-shipment-item" key={i}>
                    <div className="to-shipment-item__img-wrap">
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.title}
                          className="to-shipment-item__img"
                        />
                      ) : (
                        <div className="to-shipment-item__img-placeholder">
                          <FiPackage size={16} />
                        </div>
                      )}
                    </div>
                    <div className="to-shipment-item__info">
                      <p className="to-shipment-item__name">{item.title}</p>
                      <p className="to-shipment-item__meta">
                        <span>Qty: {item.quantity}</span>
                        {item.selectedSize && <span>· Size: {item.selectedSize}</span>}
                        {item.selectedColor && <span>· {item.selectedColor}</span>}
                      </p>
                    </div>
                    <div className="to-shipment-item__sku">
                      <FiHash size={10} />
                      {item.sku}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Full-width Timeline */}
        {order && (
          <div
            className="to-card to-card--timeline"
            style={{ '--to-accent': accent } as React.CSSProperties}
          >
            <div className="to-card__head">
              <span className="to-card__dot" style={{ background: accent }} />
              <h2 className="to-card__title">
                <FiClock size={14} style={{ marginRight: 6 }} />
                Order Progress
              </h2>
            </div>
            <PremiumTimeline events={tracking.events ?? []} orderStatus={order.orderStatus} />
          </div>
        )}
      </div>
    </div>
  )
}
