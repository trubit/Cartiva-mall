import { FiCheckCircle, FiXCircle, FiClock, FiLoader } from 'react-icons/fi'
import type { PaymentStatus } from '../../../../shared/types/payment.types.js'

interface PaymentStatusProps {
  status: PaymentStatus
  message?: string
  compact?: boolean
}

const STATUS_CONFIG: Record<
  PaymentStatus,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>
    label: string
    cls: string
  }
> = {
  pending: { icon: FiClock, label: 'Pending', cls: 'status--pending' },
  processing: { icon: FiLoader, label: 'Processing', cls: 'status--processing' },
  completed: { icon: FiCheckCircle, label: 'Paid', cls: 'status--completed' },
  failed: { icon: FiXCircle, label: 'Failed', cls: 'status--failed' },
  refunded: { icon: FiCheckCircle, label: 'Refunded', cls: 'status--refunded' },
}

export default function PaymentStatus({ status, message, compact }: PaymentStatusProps) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon

  if (compact) {
    return (
      <span className={`payment-status-badge ${cfg.cls}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className={`payment-status ${cfg.cls}`}>
      <Icon size={20} className="payment-status__icon" />
      <div className="payment-status__body">
        <span className="payment-status__label">{cfg.label}</span>
        {message && <p className="payment-status__message">{message}</p>}
      </div>
    </div>
  )
}
