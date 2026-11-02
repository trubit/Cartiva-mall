import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Automatically scrolls the window to the top on every route transition.
 * If a hash fragment exists (e.g. #faq or #featured), scrolls smoothly to the target anchor.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      // Guard against OAuth response parameters (e.g. #state=...&access_token=..., #id_token=..., #error=...)
      // or invalid CSS selectors passed into querySelector.
      // Standard HTML element IDs start with a letter and contain only alphanumeric, hyphens, or underscores.
      const rawId = hash.startsWith('#') ? hash.slice(1) : hash
      const isValidElementId = /^[a-zA-Z][\w-]*$/.test(rawId)

      if (isValidElementId) {
        try {
          const element = document.getElementById(rawId)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            return
          }
        } catch {
          // Defensively ignore any DOM element retrieval exceptions
        }
      }
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  }, [pathname, hash])

  return null
}
