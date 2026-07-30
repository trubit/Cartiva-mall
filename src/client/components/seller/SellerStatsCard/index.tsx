import type { ReactNode } from 'react'

interface SellerStatsCardProps {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: 'teal' | 'orange' | 'green' | 'purple' | 'red'
  loading?: boolean
}

const ACCENT_MAP: Record<string, { bg: string; iconBg: string; color: string }> = {
  teal: { bg: 'rgba(0,113,133,0.08)', iconBg: 'rgba(0,113,133,0.15)', color: '#007185' },
  orange: { bg: 'rgba(255,153,0,0.08)', iconBg: 'rgba(255,153,0,0.18)', color: '#e47911' },
  green: { bg: 'rgba(6,125,98,0.08)', iconBg: 'rgba(6,125,98,0.15)', color: '#067D62' },
  purple: { bg: 'rgba(124,58,237,0.08)', iconBg: 'rgba(124,58,237,0.15)', color: '#7c3aed' },
  red: { bg: 'rgba(220,38,38,0.08)', iconBg: 'rgba(220,38,38,0.15)', color: '#dc2626' },
}

export default function SellerStatsCard({
  icon,
  label,
  value,
  sub,
  accent = 'teal',
  loading = false,
}: SellerStatsCardProps) {
  const a = ACCENT_MAP[accent]

  if (loading) {
    return (
      <div className="sl-stat-card sl-stat-card--loading">
        <div
          className="sl-stat-card__icon-wrap skeleton"
          style={{ width: 44, height: 44, borderRadius: 12 }}
        />
        <div className="sl-stat-card__body">
          <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 6 }} />
          <div
            className="skeleton"
            style={{ height: 14, width: 110, borderRadius: 4, marginTop: 4 }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="sl-stat-card" style={{ background: a.bg }}>
      <div className="sl-stat-card__icon-wrap" style={{ background: a.iconBg, color: a.color }}>
        {icon}
      </div>
      <div className="sl-stat-card__body">
        <span className="sl-stat-card__value" style={{ color: 'var(--color-neutral-900)' }}>
          {value}
        </span>
        <span className="sl-stat-card__label">{label}</span>
        {sub && <p className="sl-stat-card__sub">{sub}</p>}
      </div>
    </div>
  )
}
