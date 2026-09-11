import React, { useState, useRef, useEffect } from 'react'
import { FiChevronDown, FiCheck, FiDollarSign } from 'react-icons/fi'
import { useCurrencyStore } from '../../../store/currencyStore.js'
import { SUPPORTED_CURRENCIES } from '../../../../shared/constants/currencies.js'

interface CurrencySelectorProps {
  variant?: 'navbar' | 'compact' | 'modal'
  className?: string
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  variant = 'navbar',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentCurrency = useCurrencyStore((s) => s.currentCurrency)
  const setCurrency = useCurrencyStore((s) => s.setCurrency)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeMeta = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES['USD']
  const currencyList = Object.values(SUPPORTED_CURRENCIES).filter((c) => c.isActive)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={menuRef}
      className={`cartiva-currency-selector ${className || ''}`}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        className={`amz-action-link__btn ${variant === 'navbar' ? 'amz-lang__btn' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Select Currency"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.85rem',
          color: 'inherit',
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{activeMeta.flag}</span>
        <span style={{ fontWeight: 700 }}>{activeMeta.code}</span>
        <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>({activeMeta.symbol})</span>
        <FiChevronDown size={11} style={{ opacity: 0.7, marginLeft: 2 }} />
      </button>

      {isOpen && (
        <div
          className="amz-lang__dropdown"
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 1000,
            minWidth: 200,
            background: 'var(--color-surface, #ffffff)',
            color: 'var(--color-text, #111827)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
            borderRadius: 8,
            padding: '0.5rem 0',
            marginTop: 4,
            border: '1px solid var(--color-border, #e5e7eb)',
          }}
        >
          <div
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-muted, #6b7280)',
              borderBottom: '1px solid var(--color-border, #e5e7eb)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FiDollarSign size={13} />
            Select Currency
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {currencyList.map((cur) => {
              const isSelected = cur.code === currentCurrency
              return (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => {
                    setCurrency(cur.code)
                    setIsOpen(false)
                  }}
                  role="menuitem"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: isSelected ? 'rgba(255, 153, 0, 0.1)' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: isSelected ? '#ea580c' : 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem' }}>{cur.flag}</span>
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 500 }}>
                        {cur.code} <span style={{ opacity: 0.7 }}>({cur.symbol})</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.65 }}>{cur.name}</div>
                    </div>
                  </div>
                  {isSelected && <FiCheck size={14} style={{ color: '#ea580c' }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default CurrencySelector
