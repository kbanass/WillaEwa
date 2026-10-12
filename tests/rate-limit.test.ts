import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../functions/_shared/env'
import { checkRateLimit, enforceRateLimit } from '../functions/_shared/rate-limit'

/** Enough of KV for the rate limiter: an in-memory map without expiration. */
function fakeKv() {
  const store = new Map<string, string>()
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value)
    },
  } as unknown as KVNamespace & { store: Map<string, string> }
}

const rule = { name: 'test', limit: 3, windowSeconds: 60 }
const windowStartMs = 1_800_000_000_000 // divisible by 60 s

describe('checkRateLimit', () => {
  it('lets requests through up to the limit, then blocks', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 3; i++) {
      expect(await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs)).toBeNull()
    }
    expect(await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs)).not.toBeNull()
  })

  it('says how many seconds are left in the window', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 3; i++) await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs)
    expect(await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs + 45_000)).toBe(15)
  })

  it('counts every client separately', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 3; i++) await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs)
    expect(await checkRateLimit(kv, rule, '2.2.2.2', windowStartMs)).toBeNull()
  })

  it('starts counting again in the next window', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 3; i++) await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs)
    expect(await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs + 60_000)).toBeNull()
  })

  it("doesn't write to KV once the limit is used up", async () => {
    const kv = fakeKv()
    const put = vi.spyOn(kv, 'put')
    for (let i = 0; i < 10; i++) await checkRateLimit(kv, rule, '1.1.1.1', windowStartMs)
    expect(put).toHaveBeenCalledTimes(3)
  })
})

describe('enforceRateLimit', () => {
  afterEach(() => vi.restoreAllMocks())

  const request = () =>
    new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.1.1.1' },
    })

  it('answers 429 with Retry-After when the client is over the limit', async () => {
    const env = { RATE_LIMIT_KV: fakeKv() } as unknown as Env
    for (let i = 0; i < 3; i++) expect(await enforceRateLimit(request(), env, rule)).toBeNull()

    const response = await enforceRateLimit(request(), env, rule)
    expect(response?.status).toBe(429)
    expect(Number(response?.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(await response?.json()).toEqual({ error: expect.any(String) })
  })

  it('lets the request through when KV is not bound', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await enforceRateLimit(request(), {} as Env, rule)).toBeNull()
  })

  it('lets the request through when KV fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const kv = fakeKv()
    vi.spyOn(kv, 'get').mockRejectedValue(new Error('KV is down'))
    const env = { RATE_LIMIT_KV: kv } as unknown as Env
    expect(await enforceRateLimit(request(), env, rule)).toBeNull()
  })
})
