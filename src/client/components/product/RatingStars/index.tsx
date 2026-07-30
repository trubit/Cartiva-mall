interface RatingStarsProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

export default function RatingStars({
  value,
  max = 5,
  size = 'sm',
  showValue = false,
  className = '',
}: RatingStarsProps) {
  return (
    <span className={`rating-stars rating-stars--${size} ${className}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(value)
        const half = !filled && i < value
        return (
          <span
            key={i}
            className={`rating-stars__star${filled ? ' rating-stars__star--filled' : half ? ' rating-stars__star--half' : ''}`}
          >
            ★
          </span>
        )
      })}
      {showValue && (
        <span style={{ marginLeft: '4px', fontSize: '0.8em', opacity: 0.8 }}>
          {value.toFixed(1)}
        </span>
      )}
    </span>
  )
}
