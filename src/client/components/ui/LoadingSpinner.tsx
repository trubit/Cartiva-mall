import Logo from './Logo/index.js'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  fullscreen?: boolean
  label?: string
}

export default function LoadingSpinner({
  size = 'md',
  fullscreen = false,
  label = 'Loading Cartiva…',
}: LoadingSpinnerProps) {
  const sizeMap = { sm: 28, md: 44, lg: 64 }
  const px = sizeMap[size]

  if (fullscreen) {
    return (
      <div
        className="cv-loading-screen"
        role="status"
        aria-live="polite"
        aria-label={label}
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.75rem',
          backgroundColor: 'var(--color-bg, #0B2150)',
          color: 'var(--color-text, #ffffff)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99999,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(232, 160, 32, 0.22) 0%, rgba(11, 33, 80, 0) 70%)',
              filter: 'blur(10px)',
              pointerEvents: 'none',
              animation: 'cvPulse 2.4s ease-in-out infinite',
            }}
          />

          {/* Centered Brand Mark with animated outer orbit */}
          <div style={{ position: 'relative', padding: '16px' }}>
            <Logo size="lg" iconOnly theme="auto" />
            <svg
              width="80"
              height="80"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                animation: 'cvSpin 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                pointerEvents: 'none',
              }}
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="url(#cvGoldGradient)"
                strokeWidth="3.5"
                strokeDasharray="90 190"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="cvGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8A020" />
                  <stop offset="100%" stopColor="#F5C86A" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Brand Wordmark & Tagline */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
        >
          <Logo size="md" theme="auto" />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--color-neutral-400, rgba(255, 255, 255, 0.65))',
              letterSpacing: '0.02em',
            }}
          >
            <span>{label}</span>
          </div>

          {/* Elegant progress track */}
          <div
            style={{
              width: '180px',
              height: '3px',
              backgroundColor: 'rgba(232, 160, 32, 0.15)',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
              marginTop: '0.75rem',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '45%',
                background: 'linear-gradient(90deg, #E8A020, #F5C86A)',
                borderRadius: '999px',
                animation: 'cvTrackSlide 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes cvSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes cvPulse {
            0%, 100% { transform: scale(0.95); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          @keyframes cvTrackSlide {
            0% { left: -50%; }
            50% { left: 35%; }
            100% { left: 105%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .cv-loading-screen * {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    )
  }

  // Inline Loader: Compact, animated Cartiva Mark
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: px,
        height: px,
        position: 'relative',
      }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'cvInlineSpin 1.2s linear infinite',
          display: 'block',
        }}
      >
        <circle cx="50" cy="50" r="38" stroke="rgba(232, 160, 32, 0.2)" strokeWidth="8" />
        <path
          d="M 82.77 27.06 A 38 38 0 0 0 23.14 76.85"
          stroke="#E8A020"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="82.77" cy="27.06" r="5" fill="#F5C86A" />
      </svg>
      <style>{`
        @keyframes cvInlineSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          svg {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
