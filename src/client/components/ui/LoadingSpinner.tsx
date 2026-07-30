interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  fullscreen?: boolean
  label?: string
}

export default function LoadingSpinner({
  size = 'md',
  fullscreen = false,
  label = 'Loading...',
}: LoadingSpinnerProps) {
  const sizeMap = { sm: 24, md: 40, lg: 64 }
  const px = sizeMap[size]

  const spinner = (
    <div
      role="status"
      aria-label={label}
      style={{
        width: px,
        height: px,
        border: `${px / 8}px solid var(--color-neutral-200)`,
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }}
    />
  )

  if (!fullscreen) return spinner

  return (
    <div
      className="flex-center"
      style={{ minHeight: '100vh', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      {spinner}
      <span style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>{label}</span>
    </div>
  )
}
