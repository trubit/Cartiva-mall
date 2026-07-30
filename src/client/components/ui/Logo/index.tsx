import type { CSSProperties } from 'react'

export interface LogoProps {
  size?: 'lg' | 'md' | 'sm' | 'xs'
  /**
   * auto  — adapts to OS / site theme via CSS custom properties
   * light — navy mark + dark wordmark (on light backgrounds)
   * dark  — amber mark + white wordmark (on dark / brand backgrounds)
   */
  theme?: 'auto' | 'light' | 'dark'
  iconOnly?: boolean
  className?: string
  style?: CSSProperties
}

interface SizeConfig {
  mark: number // mark SVG size px
  wm: number // wordmark font size px
  sub: number // "marketplace" sub-label font size
  gap: number // gap between mark and wordmark
  subMt: number // margin-top of sub-label
}

const SIZES: Record<NonNullable<LogoProps['size']>, SizeConfig> = {
  lg: { mark: 48, wm: 26, sub: 8.5, gap: 14, subMt: 5 },
  md: { mark: 34, wm: 18, sub: 6, gap: 10, subMt: 4 },
  sm: { mark: 26, wm: 14, sub: 5, gap: 8, subMt: 3 },
  xs: { mark: 20, wm: 11, sub: 4, gap: 6, subMt: 2 },
}

interface ColorSet {
  arc: string // outer ring / C arc
  dot: string // accent dots (cart-wheel metaphor)
  cart: string // light name part
  bold: string // bold name part
  sub: string // sub-label
}

const THEMES: Record<NonNullable<LogoProps['theme']>, ColorSet> = {
  dark: {
    arc: '#E8A020',
    dot: '#F5C86A',
    cart: 'rgba(255,255,255,0.70)',
    bold: '#FFFFFF',
    sub: 'rgba(232,160,32,0.80)',
  },
  light: {
    arc: '#0B2150',
    dot: '#E8A020',
    cart: '#0B2150',
    bold: '#0B2150',
    sub: '#E8A020',
  },
  auto: {
    arc: 'var(--cv-logo-arc,  #0B2150)',
    dot: 'var(--cv-logo-dot,  #E8A020)',
    cart: 'var(--cv-logo-cart, #0B2150)',
    bold: 'var(--cv-logo-bold, #0B2150)',
    sub: 'var(--cv-logo-sub,  #E8A020)',
  },
}

const WM_FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif"

/*
  Cartiva mark concept:
  ─────────────────────
  A clean geometric C — 290° arc — with two small filled circles
  at the open tips (evoking cart wheels and forward momentum).
  Inside the C, a minimal right-pointing arrow chevron signals
  commerce, discovery, and direction.

  The C + arrow = "Cart" + "iva" (Latin: living / active).
  Simple, scalable, distinctive at every size.
*/
function CartivaMarkSvg({ size, c }: { size: SizeConfig; c: ColorSet }) {
  const sw = Math.max(2, size.mark * 0.09) // stroke width scales with size
  const r = 40 // arc radius (in 100-unit viewBox)
  const dotR = sw * 1.5 // wheel-dot radius

  // Arc: 230° sweep, opening on the right, with the gap centred at 3 o'clock
  // Start: 3 o'clock + 35° = 125° from positive-x → top-right
  // Clockwise 290° sweep
  const startDeg = 35 // gap starts 35° above 3 o'clock
  const toRad = (d: number) => (d * Math.PI) / 180

  // Points on the arc (SVG coords: 0° = 3 o'clock, clockwise)
  const cx = 50
  const cy = 50
  const arcStartX = cx + r * Math.cos(toRad(-startDeg))
  const arcStartY = cy + r * Math.sin(toRad(-startDeg))
  const arcEndX = cx + r * Math.cos(toRad(startDeg))
  const arcEndY = cy + r * Math.sin(toRad(startDeg))

  // Chevron arrow: centered, pointing right
  const arrowSize = r * 0.38
  const aX = cx - 6 // nudge left so it reads centred inside the C
  const arrowPath = `M ${aX - arrowSize * 0.5} ${cy - arrowSize} L ${aX + arrowSize * 0.5} ${cy} L ${aX - arrowSize * 0.5} ${cy + arrowSize}`

  return (
    <svg
      width={size.mark}
      height={size.mark}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* The C arc — 290° sweep */}
      <path
        d={`M ${arcStartX.toFixed(2)} ${arcStartY.toFixed(2)} A ${r} ${r} 0 1 0 ${arcEndX.toFixed(2)} ${arcEndY.toFixed(2)}`}
        stroke={c.arc}
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />

      {/* Cart-wheel dots at the open ends of the C */}
      <circle cx={arcStartX.toFixed(2)} cy={arcStartY.toFixed(2)} r={dotR} fill={c.dot} />
      <circle cx={arcEndX.toFixed(2)} cy={arcEndY.toFixed(2)} r={dotR} fill={c.dot} />

      {/* Directional chevron inside the C */}
      <path
        d={arrowPath}
        stroke={c.dot}
        strokeWidth={sw * 0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.85}
      />
    </svg>
  )
}

export default function Logo({
  size = 'md',
  theme = 'auto',
  iconOnly = false,
  className,
  style,
}: LogoProps) {
  const s = SIZES[size]
  const c = THEMES[theme]

  return (
    <span
      className={`cv-logo${className ? ` ${className}` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
      aria-label="Cartiva"
      role="img"
    >
      <CartivaMarkSvg size={s} c={c} />

      {!iconOnly && (
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Wordmark: "Cart" thin + "iva" bold — two weights, one word */}
          <span style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
            <span
              style={{
                fontSize: s.wm,
                fontWeight: 300,
                letterSpacing: '0.04em',
                color: c.cart,
                fontFamily: WM_FONT,
                lineHeight: 1,
              }}
            >
              Cart
            </span>
            <span
              style={{
                fontSize: s.wm,
                fontWeight: 800,
                letterSpacing: '0.01em',
                color: c.bold,
                fontFamily: WM_FONT,
                lineHeight: 1,
              }}
            >
              iva
            </span>
          </span>

          {/* Sub-label */}
          <span
            style={{
              fontSize: s.sub,
              fontWeight: 600,
              letterSpacing: '0.40em',
              textTransform: 'uppercase',
              color: c.sub,
              fontFamily: WM_FONT,
              lineHeight: 1,
              marginTop: s.subMt,
            }}
          >
            Marketplace
          </span>
        </span>
      )}
    </span>
  )
}
