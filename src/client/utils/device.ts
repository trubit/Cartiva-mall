/**
 * Accurately detects mobile phones and tablets (including iPadOS Safari,
 * which presents a Macintosh desktop user agent with touch points).
 */
export const isMobileOrTabletDevice = (): boolean => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIPadOS =
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  const isMobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)
  const isTouchScreen =
    (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
    Boolean(
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    )
  const isSmallScreen = typeof window.innerWidth === 'number' && window.innerWidth <= 1024
  return isIPadOS || isMobileUa || (isTouchScreen && isSmallScreen)
}
