const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const CDN_BASE = CLOUD_NAME
  ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`
  : null

/**
 * Resolves any stored image value to a full URL.
 *
 * Handles three formats that may exist in the database:
 *   1. Already a full URL  → returned as-is
 *   2. Cloudinary public ID (e.g. "v1234/folder/abc123" or "abc123")
 *      → prefixed with the Cloudinary CDN base
 *   3. Bare filename       → same prefix treatment
 */
export function getImageUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined
  // Already a valid absolute URL — trust it
  if (/^https?:\/\//i.test(src)) return src
  // Relative path from old local-storage era
  if (src.startsWith('/')) return src
  // Cloudinary public ID / filename — build the CDN URL
  if (CDN_BASE) return `${CDN_BASE}/${src}`
  // No cloud name configured — can't resolve
  return undefined
}
