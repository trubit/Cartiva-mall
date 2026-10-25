import { useState, useEffect, useCallback, useRef } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isBackendReachable: boolean
  statusMessage: string | null
  statusType: 'offline' | 'restored' | 'server-error' | null
  checkConnection: () => Promise<boolean>
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [isBackendReachable, setIsBackendReachable] = useState<boolean>(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'offline' | 'restored' | 'server-error' | null>(null)

  const wasOfflineRef = useRef<boolean>(false)
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false)
      setIsBackendReachable(false)
      setStatusType('offline')
      setStatusMessage("You're offline. You can continue using available saved information.")
      wasOfflineRef.current = true
      return false
    }

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)

      const res = await fetch('/api/v1/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (res.ok) {
        setIsOnline(true)
        setIsBackendReachable(true)

        if (wasOfflineRef.current) {
          wasOfflineRef.current = false
          setStatusType('restored')
          setStatusMessage('Connection restored. Checking for pending updates.')

          if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
          dismissTimeoutRef.current = setTimeout(() => {
            setStatusMessage(null)
            setStatusType(null)
          }, 4500)
        } else {
          setStatusMessage(null)
          setStatusType(null)
        }
        return true
      } else {
        setIsBackendReachable(false)
        setStatusType('server-error')
        setStatusMessage("We couldn't reach the server. Please try again.")
        return false
      }
    } catch {
      // Backend probe unreachable or timeout
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false)
        setIsBackendReachable(false)
        setStatusType('offline')
        setStatusMessage("You're offline. You can continue using available saved information.")
        wasOfflineRef.current = true
      } else {
        setIsBackendReachable(false)
        setStatusType('server-error')
        setStatusMessage("We couldn't reach the server. Please try again.")
      }
      return false
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void checkConnection()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsBackendReachable(false)
      wasOfflineRef.current = true
      setStatusType('offline')
      setStatusMessage("You're offline. You can continue using available saved information.")
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial silent check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline()
    }

    // Gentle heartbeat check every 30s when online
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void checkConnection()
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
    }
  }, [checkConnection])

  return {
    isOnline,
    isBackendReachable,
    statusMessage,
    statusType,
    checkConnection,
  }
}
