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
      const element = document.querySelector(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        return
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
