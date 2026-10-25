import { useState } from 'react'
import { FiWifiOff, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useNetworkStatus } from '../../../hooks/useNetworkStatus.js'
import './connectionStatus.css'

export default function ConnectionStatus() {
  const { statusMessage, statusType, checkConnection } = useNetworkStatus()
  const [isRetrying, setIsRetrying] = useState(false)

  if (!statusMessage || !statusType) {
    return null
  }

  const handleManualRetry = async () => {
    setIsRetrying(true)
    try {
      await checkConnection()
    } finally {
      setIsRetrying(false)
    }
  }

  const getIcon = () => {
    switch (statusType) {
      case 'offline':
        return <FiWifiOff aria-hidden="true" />
      case 'restored':
        return <FiCheckCircle aria-hidden="true" />
      case 'server-error':
        return <FiAlertCircle aria-hidden="true" />
      default:
        return null
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`cartiva-connection-banner cartiva-connection-banner--${statusType}`}
    >
      <div className="cartiva-connection-banner__content">
        <span className="cartiva-connection-banner__icon">{getIcon()}</span>
        <span className="cartiva-connection-banner__text">{statusMessage}</span>
      </div>

      {(statusType === 'offline' || statusType === 'server-error') && (
        <button
          type="button"
          className="cartiva-connection-banner__retry-btn"
          onClick={handleManualRetry}
          disabled={isRetrying}
          aria-label="Retry connection check"
        >
          {isRetrying ? 'Checking…' : 'Retry'}
        </button>
      )}
    </div>
  )
}
