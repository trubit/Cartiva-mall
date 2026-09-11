import { useState, useEffect } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { useGoogleLogin } from '@react-oauth/google'
import { useGoogleAuth } from '../../../hooks/useAuth.js'

interface SocialLoginProps {
  role?: 'user' | 'seller'
}

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  '734121952137-gr7nf99dj0hg3jrsraj994olqame0ckn.apps.googleusercontent.com'

export default function SocialLogin({ role }: SocialLoginProps) {
  const googleAuthMutation = useGoogleAuth()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Direct mobile redirect fallback to avoid popup blockers on mobile browsers
  const startDirectGoogleRedirect = () => {
    try {
      const redirectUri = window.location.origin + window.location.pathname
      const scope = encodeURIComponent('openid email profile')
      const state = encodeURIComponent(JSON.stringify({ role: role || 'user' }))
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=token&scope=${scope}&state=${state}&prompt=select_account`
      window.location.href = oauthUrl
    } catch {
      setErrorMsg('Failed to open Google Sign-In. Please try again.')
    }
  }

  // Handle access_token returned in URL hash after mobile redirect
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const stateParam = hashParams.get('state')

      let targetRole = role
      if (stateParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(stateParam))
          if (parsed.role) targetRole = parsed.role
        } catch {
          // ignore
        }
      }

      if (accessToken) {
        // Clean the hash from the browser address bar
        window.history.replaceState(null, '', window.location.pathname)
        googleAuthMutation.mutate({ token: accessToken, role: targetRole })
      }
    }
  }, [])

  // Desktop popup flow via useGoogleLogin
  const loginWithGooglePopup = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setErrorMsg(null)
      if (tokenResponse.access_token) {
        googleAuthMutation.mutate({ token: tokenResponse.access_token, role })
      }
    },
    onError: (errorResponse) => {
      setErrorMsg(
        `Google sign-in failed: ${errorResponse.error_description || errorResponse.error || 'Please try again.'}`,
      )
    },
    onNonOAuthError: (nonOAuthError) => {
      if (nonOAuthError.type === 'popup_failed_to_open') {
        // Automatically switch to full-page redirect if mobile browser blocked popup
        startDirectGoogleRedirect()
      } else if (nonOAuthError.type === 'popup_closed') {
        setErrorMsg('Google sign-in was closed before completing. Please try again.')
      } else {
        setErrorMsg('Google sign-in failed. Please try again.')
      }
    },
    flow: 'implicit',
  })

  const handleGoogleClick = () => {
    setErrorMsg(null)

    // Detect mobile device
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (isMobile) {
      // Use direct redirect on mobile to eliminate popup blocking entirely
      startDirectGoogleRedirect()
    } else {
      // Use popup flow on desktop
      loginWithGooglePopup()
    }
  }

  return (
    <div>
      <div className="auth-divider">or continue with</div>

      {errorMsg && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '0.8rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {googleAuthMutation.isError && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '0.8rem',
          }}
        >
          {(googleAuthMutation.error as any)?.response?.data?.message ||
            'Google authentication failed. Please check your credentials and try again.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-social"
          onClick={handleGoogleClick}
          disabled={googleAuthMutation.isPending}
          style={{ cursor: googleAuthMutation.isPending ? 'wait' : 'pointer' }}
        >
          <FcGoogle size={20} />
          {googleAuthMutation.isPending
            ? 'Signing in with Google...'
            : role === 'seller'
              ? 'Sign up with Google'
              : 'Continue with Google'}
        </button>
      </div>
    </div>
  )
}
