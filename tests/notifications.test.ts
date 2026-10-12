import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../functions/_shared/env'
import {
  sendNewReviewNotification,
  sendNewReviewTelegram,
} from '../functions/_shared/notifications'

// The review form is public, so author and quote are attacker-controlled.
// These tests guard the XSS fix: user text must reach the e-mail and the
// Telegram message (parse_mode HTML) escaped, never as markup.

const env = {
  RESEND_API_KEY: 'key',
  MAIL_FROM: 'noreply@example.com',
  OWNER_EMAIL: 'owner@example.com',
  TELEGRAM_BOT_TOKEN: 'token',
  TELEGRAM_CHAT_ID: '1',
} as Env

const review = {
  author: '<img src=x onerror=alert(1)>',
  rating: 5,
  quote: '<script>alert("xss")</script> & więcej',
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

function sentBody(): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return JSON.parse(init.body as string)
}

describe('user text in notifications', () => {
  it('is escaped in the e-mail', async () => {
    await sendNewReviewNotification(env, review)
    const { html } = sentBody()
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; więcej')
  })

  it('is escaped in the Telegram message', async () => {
    await sendNewReviewTelegram(env, review)
    const { text } = sentBody()
    expect(text).not.toContain('<script>')
    expect(text).not.toContain('<img')
    expect(text).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
