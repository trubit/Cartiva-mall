import type { FC, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react'
import { useRef, useEffect } from 'react'

interface OtpInputProps {
  value: string
  onChange: (otp: string) => void
  onComplete?: (otp: string) => void
  disabled?: boolean
  autoFocus?: boolean
  error?: boolean
}

export const OtpInput: FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Ensure digits array always has 6 items
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus, disabled])

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    const newOtp = newDigits.join('')
    onChange(newOtp)

    // Auto-focus next input if filled
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.length === 6 && onComplete) {
      onComplete(newOtp)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData) {
      onChange(pastedData)
      const targetIndex = Math.min(pastedData.length, 5)
      inputRefs.current[targetIndex]?.focus()
      if (pastedData.length === 6 && onComplete) {
        onComplete(pastedData)
      }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        margin: '16px 0',
      }}
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          style={{
            width: '46px',
            height: '54px',
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 800,
            borderRadius: '10px',
            border: error
              ? '2px solid var(--color-danger, #ef4444)'
              : digit
                ? '2px solid var(--color-brand-accent, #FF9900)'
                : '1.5px solid var(--color-neutral-300, #cbd5e1)',
            background: disabled ? '#f1f5f9' : '#ffffff',
            color: '#0f172a',
            outline: 'none',
            transition: 'all 0.15s ease',
            fontFamily: 'monospace',
            boxShadow: digit ? '0 0 0 1px rgba(255, 153, 0, 0.2)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

export default OtpInput
