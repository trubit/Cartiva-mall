import type { OrderStatus, OrderPaymentStatus } from '../../../../shared/types/index.js'

// ─── Status config ────────────────────────────────────────────────────────────
const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string; icon: string }> = {
  pending: { label: 'Pending', badge: 'badge-warning', icon: '⏳' },
  confirmed: { label: 'Confirmed', badge: 'badge-primary', icon: '✅' },
  processing: { label: 'Processing', badge: 'badge-primary', icon: '⚙️' },
  shipped: { label: 'Shipped', badge: 'badge-primary', icon: '📦' },
  outForDelivery: { label: 'Out for Delivery', badge: 'badge-primary', icon: '🚚' },
  delivered: { label: 'Delivered', badge: 'badge-success', icon: '🎉' },
  cancelled: { label: 'Cancelled', badge: 'badge-danger', icon: '❌' },
  returned: { label: 'Returned', badge: 'badge-neutral', icon: '↩️' },
  refunded: { label: 'Refunded', badge: 'badge-neutral', icon: '💸' },
}

const PAYMENT_STATUS_CONFIG: Record<OrderPaymentStatus, { label: string; badge: string }> = {
  pending: { label: 'Payment Pending', badge: 'badge-warning' },
  paid: { label: 'Paid', badge: 'badge-success' },
  failed: { label: 'Payment Failed', badge: 'badge-danger' },
  refunded: { label: 'Refunded', badge: 'badge-neutral' },
}

// ─── Components ───────────────────────────────────────────────────────────────
interface OrderStatusBadgeProps {
  status: OrderStatus
  showIcon?: boolean
  size?: 'sm' | 'md'
}

export function OrderStatusBadge({ status, showIcon = false, size = 'md' }: OrderStatusBadgeProps) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? { label: status, badge: 'badge-neutral', icon: '•' }
  return (
    <span className={`badge ${cfg.badge} order-status-badge order-status-badge--${size}`}>
      {showIcon && <span className="order-status-badge__icon">{cfg.icon}</span>}
      {cfg.label}
    </span>
  )
}

interface PaymentStatusBadgeProps {
  status: OrderPaymentStatus
  size?: 'sm' | 'md'
}

export function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const cfg = PAYMENT_STATUS_CONFIG[status] ?? { label: status, badge: 'badge-neutral' }
  return (
    <span className={`badge ${cfg.badge} order-status-badge order-status-badge--${size}`}>
      {cfg.label}
    </span>
  )
}

export { ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG }
