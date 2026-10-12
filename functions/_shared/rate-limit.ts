import type { Env } from './env'
import { jsonError } from './http'

export interface RateLimitRule {
  name: string
  limit: number
  /** At least 60: KV doesn't accept a shorter expiration. */
  windowSeconds: number
}

export const RATE_LIMITS = {
  login: { name: 'login', limit: 10, windowSeconds: 15 * 60 },
  addReview: { name: 'add-review', limit: 3, windowSeconds: 60 * 60 },
  inquiry: { name: 'inquiry', limit: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>

type Counter = Pick<KVNamespace, 'get' | 'put'>

/**
 * Counts a request in a fixed time window. Returns how many seconds are left
 * until the window resets when the limit is already used up, otherwise null.
 *
 * KV is eventually consistent, so a burst spread over several Cloudflare
 * locations can slip a few requests past the limit. That's fine here: the
 * goal is to stop brute force on the login and spam on the forms, not to
 * count exactly.
 */
export async function checkRateLimit(
  kv: Counter,
  rule: RateLimitRule,
  client: string,
  nowMs = Date.now(),
): Promise<number | null> {
  const now = Math.floor(nowMs / 1000)
  const windowStart = now - (now % rule.windowSeconds)
  const key = `${rule.name}:${client}:${windowStart}`

  const count = Number(await kv.get(key)) || 0
  if (count >= rule.limit) return windowStart + rule.windowSeconds - now

  // Requests over the limit return above without a write, which keeps us
  // well inside the free plan's daily KV write quota.
  await kv.put(key, String(count + 1), { expirationTtl: rule.windowSeconds })
  return null
}

/**
 * Returns a 429 response when the client is over the limit, otherwise null.
 * If KV is missing or fails, the request goes through: a broken counter
 * shouldn't take the forms and the login down with it.
 */
export async function enforceRateLimit(
  request: Request,
  env: Env,
  rule: RateLimitRule,
): Promise<Response | null> {
  if (!env.RATE_LIMIT_KV) {
    console.warn(`[rate-limit] ${rule.name}: RATE_LIMIT_KV is not bound, skipping`)
    return null
  }
  const client = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  try {
    const retryAfter = await checkRateLimit(env.RATE_LIMIT_KV, rule, client)
    if (retryAfter === null) return null
    const response = jsonError('Zbyt wiele prób. Spróbuj ponownie później.', 429)
    response.headers.set('Retry-After', String(retryAfter))
    return response
  } catch (err) {
    console.error(`[rate-limit] ${rule.name}: KV failed, letting the request through: ${err}`)
    return null
  }
}
