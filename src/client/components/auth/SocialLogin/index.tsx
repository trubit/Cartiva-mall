import { useState, useEffect, useRef, useCallback } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { useGoogleLogin } from '@react-oauth/google'
import { useGoogleAuth } from '../../../hooks/useAuth.js'
import { isMobileOrTabletDevice } from '../../../utils/device.js'

interface SocialLoginProps {
  role?: 'user' | 'seller'
}

const DEFAULT_GOOGLE_CLIENT_ID =
  '734121952137-gr7nf99dj0hg3jrsraj994olqame0ckn.apps.googleusercontent.com'

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || DEFAULT_GOOGLE_CLIENT_ID

export default function SocialLogin({ role = 'user' }: SocialLoginProps) {
  const googleAuthMutation = useGoogleAuth()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const authProcessedRef = useRef<boolean>(false)

  // Direct mobile redirect fallback to avoid popup blockers on mobile browsers
  const startDirectGoogleRedirect = useCallback(() => {
    try {
      if (typeof window === 'undefined') return

      // Generate cryptographically secure state nonce for anti-CSRF protection
      let stateNonce = ''
      try {
        const nonceArray = new Uint8Array(16)
        window.crypto.getRandomValues(nonceArray)
        stateNonce = Array.from(nonceArray, (byte) => byte.toString(16).padStart(2, '0')).join('')
        window.sessionStorage.setItem('cv_oauth_state', stateNonce)
      } catch {
        // Fallback for environments where crypto or sessionStorage is restricted
        stateNonce = Math.random().toString(36).substring(2)
      }

      // Save intended return destination (validated to prevent open redirect)
      const currentFullUrl = window.location.pathname + window.location.search
      if (currentFullUrl.startsWith('/') && !currentFullUrl.startsWith('//')) {
        try {
          window.sessionStorage.setItem('cv_oauth_return_url', currentFullUrl)
        } catch {
          // ignore storage restrictions
        }
      }

      // Canonical redirect URI matching Google Cloud OAuth configuration
      const redirectUri = window.location.origin + '/login'
      const scope = encodeURIComponent('openid email profile')
      const statePayload = encodeURIComponent(
        JSON.stringify({ role: role || 'user', nonce: stateNonce, ts: Date.now() }),
      )
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=token&scope=${scope}&state=${statePayload}&prompt=select_account`

      window.location.href = oauthUrl
    } catch {
      setErrorMsg('Failed to open Google Sign-In. Please sign in with email and password below.')
    }
  }, [role])

  // Handle OAuth response (tokens or errors) returned via URL hash or search params
  useEffect(() => {
    if (typeof window === 'undefined' || authProcessedRef.current) return

    const hash = window.location.hash
    const search = window.location.search

    // 1. Check for OAuth error returned in URL hash or search query
    let returnedError: string | null = null
    if (hash && hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.substring(1))
      returnedError = hashParams.get('error')
    } else if (search && search.includes('error=')) {
      const searchParams = new URLSearchParams(search)
      returnedError = searchParams.get('error')
    }

    if (returnedError) {
      authProcessedRef.current = true
      // Clean hash from browser address bar immediately without touching legitimate search params
      window.history.replaceState(null, '', window.location.pathname)
      if (returnedError === 'access_denied') {
        setErrorMsg('Google sign-in was cancelled. Please try again or use your password.')
      } else {
        setErrorMsg(
          `Google sign-in encountered an issue: ${returnedError}. Please use email sign-in.`,
        )
      }
      return
    }

    // 2. Check for access_token or id_token returned in hash
    if (hash && (hash.includes('access_token=') || hash.includes('id_token='))) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const idToken = hashParams.get('id_token')
      const stateParam = hashParams.get('state')

      let targetRole = role
      if (stateParam) {
        try {
          const parsed = JSON.parse(
            stateParam.startsWith('%') ? decodeURIComponent(stateParam) : stateParam,
          )
          if (parsed.role) targetRole = parsed.role

          // Anti-CSRF verification of state nonce
          const storedNonce = window.sessionStorage.getItem('cv_oauth_state')
          if (storedNonce && parsed.nonce && storedNonce !== parsed.nonce) {
            authProcessedRef.current = true
            window.sessionStorage.removeItem('cv_oauth_state')
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            setErrorMsg('Security state verification failed. Please try signing in again.')
            return
          }
          // Consume state nonce to prevent replay
          window.sessionStorage.removeItem('cv_oauth_state')
        } catch {
          // ignore parsing error
        }
      }

      const tokenToSubmit = accessToken || idToken
      if (tokenToSubmit) {
        authProcessedRef.current = true
        // Clean the hash from the browser address bar immediately to prevent token exposure in history
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        googleAuthMutation.mutate({ token: tokenToSubmit, role: targetRole })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Desktop / tablet popup flow via useGoogleLogin with defensive initialization guard
  let loginWithGooglePopup: (() => void) | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    loginWithGooglePopup = useGoogleLogin({
      onSuccess: (tokenResponse) => {
        setErrorMsg(null)
        if (tokenResponse.access_token) {
          googleAuthMutation.mutate({ token: tokenResponse.access_token, role })
        }
      },
      onError: (errorResponse) => {
        const desc = errorResponse.error_description || errorResponse.error
        if (desc?.includes('origin_mismatch') || desc?.includes('unauthorized')) {
          setErrorMsg(
            'Google Sign-In is awaiting domain authorization in Google Cloud Console. Please sign in with email and password below.',
          )
        } else {
          setErrorMsg(`Google sign-in failed: ${desc || 'Please try again or use email sign-in.'}`)
        }
      },
      onNonOAuthError: (nonOAuthError) => {
        if (nonOAuthError.type === 'popup_failed_to_open') {
          // Automatically switch to full-page redirect if mobile or tablet blocked popup
          startDirectGoogleRedirect()
        } else if (nonOAuthError.type === 'popup_closed') {
          setErrorMsg(
            'Google sign-in window was closed. If domain authorization is pending, you can also sign in with email and password below.',
          )
        } else {
          setErrorMsg(
            'Google sign-in could not be completed. Please use email and password sign-in.',
          )
        }
      },
      flow: 'implicit',
    })
  } catch {
    // Graceful fallback if oauth2 is not yet initialized in window.google
    loginWithGooglePopup = null
  }

  const handleGoogleClick = () => {
    setErrorMsg(null)

    // Check device type
    const isMobileOrTablet = isMobileOrTabletDevice()

    if (isMobileOrTablet) {
      // Use direct redirect on mobile and tablets to eliminate popup blocking entirely
      startDirectGoogleRedirect()
    } else if (loginWithGooglePopup) {
      // Use popup flow on desktop
      loginWithGooglePopup()
    } else {
      // Fallback redirect if popup client is unavailable
      startDirectGoogleRedirect()
    }
  }

  return (
    <div className="cartiva-social-login" style={{ width: '100%', marginTop: '4px' }}>
      <div className="auth-divider">or continue with</div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#ef4444',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          {errorMsg}
        </div>
      )}

      {googleAuthMutation.isError && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#ef4444',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          {(googleAuthMutation.error as any)?.response?.data?.message ||
            'Google authentication could not be completed. Please check your credentials or sign in with your email and password.'}
        </div>
      )}

      {/* Exactly ONE Unified Responsive Google Button across All Platforms */}
      <button
        type="button"
        id="google-auth-button"
        data-testid="google-auth-btn"
        className="auth-btn auth-btn-secondary auth-btn-social"
        onClick={handleGoogleClick}
        disabled={googleAuthMutation.isPending}
        style={{
          cursor: googleAuthMutation.isPending ? 'wait' : 'pointer',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          touchAction: 'manipulation',
        }}
        aria-label={
          role === 'seller' ? 'Sign up with Google account' : 'Continue with Google account'
        }
      >
        <FcGoogle size={20} aria-hidden="true" />
        <span>
          {googleAuthMutation.isPending
            ? 'Connecting to Google…'
            : role === 'seller'
              ? 'Sign up with Google'
              : 'Continue with Google'}
        </span>
      </button>
    </div>
  )
}
