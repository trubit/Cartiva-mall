import { useState } from 'react'
import { FiTruck, FiExternalLink, FiCalendar, FiHash, FiCopy, FiCheck } from 'react-icons/fi'
import { formatDate } from '../../../../shared/helpers/index.js'
import type { IOrderTracking } from '../../../../shared/types/index.js'

interface TrackingInfoProps {
  tracking: IOrderTracking
  shippingMethod?: string
}

const METHOD_LABEL: Record<string, { label: string; icon: string; days: string }> = {
  standard: { label: 'Standard Shipping', icon: '📦', days: '5–7 business days' },
  express: { label: 'Express Shipping', icon: '⚡', days: '2–3 business days' },
  sameDay: { label: 'Same-Day Delivery', icon: '🚀', days: 'Delivered today' },
}

export default function TrackingInfo({ tracking, shippingMethod }: TrackingInfoProps) {
  const [copied, setCopied] = useState(false)
  const hasTracking = tracking.trackingNumber || tracking.carrier
  const method = shippingMethod ? METHOD_LABEL[shippingMethod] : null

  const copyTrackingNumber = async () => {
    if (!tracking.trackingNumber) return
    try {
      await navigator.clipboard.writeText(tracking.trackingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* silent */
    }
  }

  return (
    <div className="pti">
      {/* Shipping method pill */}
      {method && (
        <div className="pti-method">
          <span className="pti-method__icon">{method.icon}</span>
          <div>
            <div className="pti-method__label">{method.label}</div>
            <div className="pti-method__days">{method.days}</div>
          </div>
        </div>
      )}

      {/* ETA hero — most prominent if available */}
      {tracking.estimatedDeliveryDate && (
        <div className="pti-eta">
          <div className="pti-eta__icon">
            <FiCalendar size={18} />
          </div>
          <div>
            <div className="pti-eta__label">Estimated Delivery</div>
            <div className="pti-eta__date">
              {formatDate(tracking.estimatedDeliveryDate, { dateStyle: 'long' })}
            </div>
          </div>
        </div>
      )}

      {hasTracking ? (
        <div className="pti-rows">
          {/* Carrier */}
          {tracking.carrier && (
            <div className="pti-row">
              <span className="pti-row__label">
                <FiTruck size={12} /> Carrier
              </span>
              <span className="pti-row__value pti-row__value--carrier">{tracking.carrier}</span>
            </div>
          )}

          {/* Tracking number */}
          {tracking.trackingNumber && (
            <div className="pti-row">
              <span className="pti-row__label">
                <FiHash size={12} /> Tracking #
              </span>
              <div className="pti-tracking-num">
                <span className="pti-tracking-num__code">{tracking.trackingNumber}</span>
                <button
                  className="pti-copy-btn"
                  onClick={copyTrackingNumber}
                  title="Copy tracking number"
                  aria-label="Copy tracking number"
                >
                  {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
                </button>
              </div>
            </div>
          )}

          {/* Track externally */}
          {tracking.trackingUrl && (
            <a
              href={tracking.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pti-track-btn"
            >
              <FiExternalLink size={14} />
              Track on Carrier Website
            </a>
          )}
        </div>
      ) : (
        <div className="pti-pending">
          <div className="pti-pending__icon">
            <FiTruck size={24} />
          </div>
          <div>
            <p className="pti-pending__title">Not yet shipped</p>
            <p className="pti-pending__text">
              Tracking details will appear here once your order ships.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
