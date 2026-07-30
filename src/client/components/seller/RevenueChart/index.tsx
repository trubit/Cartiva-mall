import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { formatCurrency } from '../../../../shared/helpers/index.js'
import type { IRevenueByDay } from '../../../../shared/types/index.js'

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  outForDelivery: '#f97316',
  delivered: '#10b981',
  cancelled: '#6b7280',
  returned: '#ec4899',
  refunded: '#ef4444',
}

// ─── Revenue Area Chart ────────────────────────────────────────────────────────
interface RevenueAreaProps {
  data: IRevenueByDay[]
  loading: boolean
  height?: number
}

export function RevenueAreaChart({ data, loading, height = 220 }: RevenueAreaProps) {
  if (loading) {
    return <div className="skeleton" style={{ height, borderRadius: 8 }} />
  }
  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: 'var(--color-neutral-400)',
          fontSize: '0.83rem',
        }}
      >
        No revenue data yet
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="slRevenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#007185" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#007185" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200,#e5e7eb)" />
        <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} width={58} />
        <Tooltip
          formatter={(v) => [formatCurrency(Number(v) || 0), 'Revenue']}
          labelFormatter={(l) => `Date: ${String(l)}`}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#007185"
          fill="url(#slRevenueGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Order Status Pie ──────────────────────────────────────────────────────────
interface OrderPieProps {
  data: { _id: string; count: number }[]
  loading: boolean
  height?: number
}

export function OrderStatusPie({ data, loading, height = 220 }: OrderPieProps) {
  if (loading) return <div className="skeleton" style={{ height, borderRadius: 8 }} />

  const pieData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d._id, value: d.count, color: ORDER_STATUS_COLORS[d._id] ?? '#9ca3af' }))

  if (pieData.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: 'var(--color-neutral-400)',
          fontSize: '0.83rem',
        }}
      >
        No orders yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={72}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
          fontSize={10}
        >
          {pieData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend
          iconSize={10}
          formatter={(value: string) =>
            value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
          }
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Monthly Revenue Bar Chart ─────────────────────────────────────────────────
interface RevenueBarProps {
  data: { _id: string; revenue: number; orders: number }[]
  loading: boolean
  height?: number
}

export function RevenueBarChart({ data, loading, height = 220 }: RevenueBarProps) {
  if (loading) return <div className="skeleton" style={{ height, borderRadius: 8 }} />
  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: 'var(--color-neutral-400)',
          fontSize: '0.83rem',
        }}
      >
        No data available
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200,#e5e7eb)" />
        <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} width={58} />
        <Tooltip formatter={(v) => [formatCurrency(Number(v) || 0), 'Revenue']} />
        <Bar dataKey="revenue" fill="#007185" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
