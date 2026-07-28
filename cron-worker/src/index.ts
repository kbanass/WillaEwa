interface Env {
  SERPAPI_API_KEY: string
  GOOGLE_PLACE_ID: string
  SANITY_PROJECT_ID: string
  SANITY_DATASET: string
  SANITY_API_TOKEN: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
  RESEND_API_KEY?: string
  MAIL_FROM?: string
  OWNER_EMAIL?: string
  DOMAIN_NAME?: string
}

const SANITY_API_VERSION = '2024-01-01'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sanityQuery<T>(
  env: Env,
  groq: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(
    `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${env.SANITY_DATASET}`,
  )
  url.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(`$${k}`, JSON.stringify(v))
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.SANITY_API_TOKEN}` },
  })
  const data = (await res.json()) as { result: T }
  return data.result
}

async function sanityCreate(env: Env, doc: Record<string, unknown>): Promise<void> {
  await fetch(
    `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${env.SANITY_DATASET}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SANITY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mutations: [{ create: doc }] }),
    },
  )
}

async function googleReviewExists(env: Env, googleReviewId: string): Promise<boolean> {
  const result = await sanityQuery<{ _id: string } | null>(
    env,
    `*[_type == "review" && googleReviewId == $id][0]{ _id }`,
    { id: googleReviewId },
  )
  return result !== null
}

async function sendTelegram(env: Env, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.error('[cron] Telegram not configured, skipping notification')
    return
  }
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  })
  if (!res.ok) {
    console.error(`[cron] Telegram notification failed (${res.status}): ${await res.text()}`)
  }
}

// Mirrors sendNewReviewNotification in functions/_shared/notifications.ts,
// so a Google-sourced review reads the same as one submitted on the site.
async function sendNewReviewEmail(
  env: Env,
  review: { author: string; rating: number; quote: string },
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.OWNER_EMAIL) {
    console.error('[cron] Email not configured, skipping notification')
    return
  }
  const domain = env.DOMAIN_NAME ?? 'willaewanadmorzem.pl'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: env.OWNER_EMAIL,
      subject: `Nowa opinia – ${review.author}`,
      html: `
        <table>
          <tr><td>Autor</td><td><strong>${escapeHtml(review.author)}</strong></td></tr>
          <tr><td>Ocena</td><td>${review.rating} / 5</td></tr>
          <tr><td>Treść</td><td>${escapeHtml(review.quote)}</td></tr>
        </table>
        <p><a href="https://${domain}/panel">Przejdź do panelu</a></p>
      `,
    }),
  })
  if (!res.ok) {
    console.error(`[cron] Email notification failed (${res.status}): ${await res.text()}`)
  }
}

interface SerpApiReview {
  review_id: string
  user: { name: string }
  snippet?: string
  extracted_snippet?: { original?: string }
  rating: number
  iso_date: string
}

interface SerpApiResponse {
  reviews?: SerpApiReview[]
  serpapi_pagination?: { next_page_token?: string }
  error?: string
}

async function syncGoogleReviews(env: Env): Promise<number> {
  let savedCount = 0
  let nextPageToken: string | undefined

  do {
    const params = new URLSearchParams({
      engine: 'google_maps_reviews',
      place_id: env.GOOGLE_PLACE_ID,
      hl: 'pl',
      sort_by: 'newestFirst',
      api_key: env.SERPAPI_API_KEY,
    })
    if (nextPageToken) params.set('next_page_token', nextPageToken)

    const res = await fetch(`https://serpapi.com/search.json?${params}`)
    const data = (await res.json()) as SerpApiResponse

    if (data.error) {
      console.error('SerpAPI error:', data.error)
      break
    }

    const reviews = data.reviews ?? []
    let allExist = true

    for (const r of reviews) {
      const exists = await googleReviewExists(env, r.review_id)
      if (exists) continue

      allExist = false
      const now = Math.floor(Date.now() / 1000)
      const quote = r.snippet ?? r.extracted_snippet?.original ?? ''
      await sanityCreate(env, {
        _type: 'review',
        googleReviewId: r.review_id,
        author: r.user.name,
        quote,
        rating: r.rating,
        time: Math.floor(new Date(r.iso_date).getTime() / 1000),
        source: 'google',
        status: 'pending',
        createdAt: now,
      })
      savedCount++
      await sendNewReviewEmail(env, { author: r.user.name, rating: r.rating, quote })
    }

    nextPageToken = data.serpapi_pagination?.next_page_token
    // Stop paginating when an entire page of reviews already exists
    if (allExist && reviews.length > 0) break
  } while (nextPageToken)

  return savedCount
}

async function runSync(env: Env): Promise<void> {
  console.log('[cron] Starting Google Reviews sync')
  try {
    const count = await syncGoogleReviews(env)
    console.log(`[cron] Saved ${count} new reviews`)
    if (count > 0) {
      await sendTelegram(env, `<b>Google Reviews sync</b>\nDodano ${count} nowych opinii (oczekują na moderację)`)
    }
  } catch (err) {
    console.error('[cron] Sync failed:', err)
    await sendTelegram(env, `<b>⚠️ Google Reviews sync — błąd</b>\n${String(err)}`)
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runSync(env)
  },
}
