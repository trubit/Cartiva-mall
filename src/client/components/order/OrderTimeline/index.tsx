import { FiCheck, FiClock, FiMapPin } from 'react-icons/fi'
import { formatDate } from '../../../../shared/helpers/index.js'
import type { ITrackingEvent, OrderStatus } from '../../../../shared/types/index.js'
import { ORDER_STATUS_CONFIG } from '../OrderStatus/index.js'

interface OrderTimelineProps {
  events: ITrackingEvent[]
  orderStatus: OrderStatus
}

const STATUS_PIPELINE: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'outForDelivery',
  'delivered',
]

const pipelineIndex = (s: string) => STATUS_PIPELINE.indexOf(s as OrderStatus)

export default function OrderTimeline({ events, orderStatus }: OrderTimelineProps) {
  const currentIdx = pipelineIndex(orderStatus)
  const isCancelled = ['cancelled', 'returned', 'refunded'].includes(orderStatus)

  return (
    <div className="ptl">
      {/* ── Progress pipeline ──────────────────────────────── */}
      {!isCancelled && (
        <div className="ptl-pipeline">
          {STATUS_PIPELINE.map((step, idx) => {
            const cfg = ORDER_STATUS_CONFIG[step]
            const done = idx < currentIdx
            const active = idx === currentIdx
            const future = idx > currentIdx

            return (
              <div key={step} className="ptl-step">
                {/* Connector before */}
                {idx > 0 && (
                  <div className={`ptl-connector${done || active ? ' ptl-connector--done' : ''}`} />
                )}

                {/* Node */}
                <div
                  className={[
                    'ptl-node',
                    done ? 'ptl-node--done' : '',
                    active ? 'ptl-node--active' : '',
                    future ? 'ptl-node--future' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {done ? (
                    <FiCheck size={16} />
                  ) : (
                    <span className="ptl-node__icon">{cfg.icon}</span>
                  )}
                  {active && <span className="ptl-node__pulse" />}
                </div>

                {/* Label */}
                <span
                  className={[
                    'ptl-label',
                    done ? 'ptl-label--done' : '',
                    active ? 'ptl-label--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Cancelled / returned banner */}
      {isCancelled && (
        <div className="ptl-cancelled">
          <span className="ptl-cancelled__icon">
            {ORDER_STATUS_CONFIG[orderStatus]?.icon ?? '✕'}
          </span>
          <div>
            <p className="ptl-cancelled__title">
              Order {ORDER_STATUS_CONFIG[orderStatus]?.label ?? orderStatus}
            </p>
            <p className="ptl-cancelled__sub">This order is no longer active.</p>
          </div>
        </div>
      )}

      {/* ── Event history ──────────────────────────────────── */}
      {events.length > 0 && (
        <div className="ptl-events">
          <div className="ptl-events__header">
            <FiClock size={13} />
            <span>Shipment History</span>
          </div>

          <div className="ptl-event-list">
            {[...events].reverse().map((ev, i) => {
              const cfg = ORDER_STATUS_CONFIG[ev.status as OrderStatus]
              const latest = i === 0
              return (
                <div key={i} className={`ptl-event${latest ? ' ptl-event--latest' : ''}`}>
                  {/* Vertical line */}
                  {i < events.length - 1 && <div className="ptl-event__line" />}

                  {/* Dot */}
                  <div className={`ptl-event__dot${latest ? ' ptl-event__dot--active' : ''}`}>
                    {latest ? <FiCheck size={10} /> : <span className="ptl-event__dot-inner" />}
                  </div>

                  {/* Content */}
                  <div className="ptl-event__body">
                    <div className="ptl-event__head">
                      <span className="ptl-event__icon">{cfg?.icon ?? '•'}</span>
                      <span className="ptl-event__status">{cfg?.label ?? ev.status}</span>
                      {latest && <span className="ptl-event__latest-badge">Latest</span>}
                    </div>
                    {ev.description && <p className="ptl-event__desc">{ev.description}</p>}
                    {ev.location && (
                      <p className="ptl-event__location">
                        <FiMapPin size={11} />
                        {ev.location}
                      </p>
                    )}
                    <time className="ptl-event__time">
                      {formatDate(ev.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {events.length === 0 && !isCancelled && (
        <p className="ptl-no-events">
          Shipment history will appear here once your order starts moving.
        </p>
      )}
    </div>
  )
}
