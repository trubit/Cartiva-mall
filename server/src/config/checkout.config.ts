export const CHECKOUT_SESSION_TTL_MS = parseInt(
  process.env.CHECKOUT_SESSION_TTL_MS ?? String(2 * 60 * 60 * 1000),
  10,
) // 2 hours
