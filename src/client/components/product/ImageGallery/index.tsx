import { useState } from 'react'
import { getImageUrl } from '../../../utils/image.js'

interface ImageGalleryProps {
  images: string[]
  title: string
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [active, setActive] = useState(0)
  const imgs = (images.length > 0 ? images : ['']).map((s) => getImageUrl(s) ?? '')

  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        {imgs[active] ? (
          <img
            src={imgs[active]}
            alt={`${title} — image ${active + 1}`}
            className="product-gallery__main-img"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5rem',
              background: 'var(--color-neutral-100)',
            }}
          >
            🛍️
          </div>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="product-gallery__thumbs">
          {imgs.map((img, i) => (
            <button
              key={i}
              className={`product-gallery__thumb${i === active ? ' product-gallery__thumb--active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              style={{ padding: 0, border: 'none', cursor: 'pointer' }}
            >
              {img ? (
                <img src={img} alt={`Thumbnail ${i + 1}`} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-neutral-100)',
                    fontSize: '1.5rem',
                  }}
                >
                  🛍️
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
