import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiX, FiClock } from 'react-icons/fi'
import { useProductSuggestions } from '../../../hooks/useProducts.js'

const RECENT_KEY = 'cartiva:recent_searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveRecentSearch(q: string) {
  const prev = getRecentSearches().filter((s) => s !== q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)))
}

interface ProductSearchProps {
  defaultValue?: string
  placeholder?: string
  onSearch?: (q: string) => void
}

export default function ProductSearch({
  defaultValue = '',
  placeholder = 'Search products…',
  onSearch,
}: ProductSearchProps) {
  const [value, setValue] = useState(defaultValue)
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Debounce the query sent to the API
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(value.trim()), 250)
    return () => clearTimeout(id)
  }, [value])

  const { data: suggestions = [] } = useProductSuggestions(debouncedQ)
  const recentSearches = getRecentSearches()

  const showSuggestions = open && debouncedQ.length >= 2 && suggestions.length > 0
  const showRecent = open && debouncedQ.length < 2 && recentSearches.length > 0
  const dropdownVisible = showSuggestions || showRecent

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const submit = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) return
      saveRecentSearch(trimmed)
      setOpen(false)
      if (onSearch) {
        onSearch(trimmed)
      } else {
        navigate(`/search?q=${encodeURIComponent(trimmed)}`)
      }
    },
    [onSearch, navigate],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = showSuggestions ? suggestions : recentSearches
    if (!dropdownVisible) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      submit(items[activeIdx] ?? value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleClear = () => {
    setValue('')
    setDebouncedQ('')
    setActiveIdx(-1)
    inputRef.current?.focus()
    onSearch?.('')
  }

  return (
    <div ref={containerRef} className="product-search-wrap" style={{ position: 'relative' }}>
      <form className="product-search" onSubmit={handleSubmit} role="search">
        <input
          ref={inputRef}
          type="search"
          className="product-search__input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
            setActiveIdx(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              background: 'none',
              border: 'none',
              padding: '0 0.5rem',
              cursor: 'pointer',
              color: 'var(--color-neutral-400)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FiX size={16} />
          </button>
        )}

        <button type="submit" className="product-search__btn" aria-label="Search">
          <FiSearch size={18} />
        </button>
      </form>

      {dropdownVisible && (
        <ul
          className="search-dropdown"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--color-white)',
            border: '1px solid var(--color-neutral-200)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            zIndex: 1000,
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {showRecent && (
            <>
              <li
                style={{
                  padding: '6px 14px 2px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-400)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Recent Searches
              </li>
              {recentSearches.map((s, i) => (
                <li
                  key={s}
                  role="option"
                  aria-selected={activeIdx === i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    background: activeIdx === i ? 'var(--color-brand-bg)' : 'transparent',
                    color: 'var(--color-neutral-800)',
                  }}
                  onMouseDown={() => submit(s)}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <FiClock size={13} style={{ color: 'var(--color-neutral-400)', flexShrink: 0 }} />
                  {s}
                </li>
              ))}
            </>
          )}

          {showSuggestions &&
            suggestions.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={activeIdx === i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  background: activeIdx === i ? 'var(--color-brand-bg)' : 'transparent',
                  color: 'var(--color-neutral-800)',
                }}
                onMouseDown={() => submit(s)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <FiSearch size={13} style={{ color: 'var(--color-neutral-400)', flexShrink: 0 }} />
                {s}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
