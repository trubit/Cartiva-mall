import crypto from 'crypto'

/**
 * Lightweight, cryptographically secure ID generator matching the nanoid signature.
 * Uses Node's built-in crypto module to ensure 100% build reliability without external dependency.
 */
export const nanoid = (size = 21): string => {
  return crypto.randomBytes(size).toString('base64url').slice(0, size)
}

export default nanoid
