import { useState, useEffect } from 'react'
import { FiHeart } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore.js'
import { dashboardService } from '../../../services/dashboardService.js'
import { useNavigate } from 'react-router-dom'

interface WishlistButtonProps {
  productId: string
  size?: number
  className?: string
}

export default function WishlistButton({ productId, size = 16, className = '' }: WishlistButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [inWishlist, setInWishlist] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) return
    dashboardService.checkWishlist(productId).then(setInWishlist).catch(() => {})
  }, [productId, isAuthenticated])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      if (inWishlist) {
        await dashboardService.removeFromWishlist(productId)
        setInWishlist(false)
      } else {
        await dashboardService.addToWishlist(productId)
        setInWishlist(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`wishlist-btn${inWishlist ? ' wishlist-btn--active' : ''} ${className}`}
      onClick={toggle}
      disabled={loading}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      style={{
        background: 'none',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        padding: '0.35rem',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: inWishlist ? '#e53e3e' : 'var(--color-neutral-400)',
        transition: 'color 0.15s, transform 0.15s',
        transform: loading ? 'scale(0.9)' : 'scale(1)',
      }}
    >
      <FiHeart
        size={size}
        fill={inWishlist ? '#e53e3e' : 'none'}
      />
    </button>
  )
}
