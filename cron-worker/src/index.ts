interface Env {
  SERPAPI_API_KEY: string
  GOOGLE_PLACE_ID: string
  SANITY_PROJECT_ID: string
  SANITY_DATASET: string
  SANITY_API_TOKEN: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
}

const SANITY_API_VERSION = '2024-01-01'

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
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  })
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
      await sanityCreate(env, {
        _type: 'review',
        googleReviewId: r.review_id,
        author: r.user.name,
        quote: r.snippet ?? r.extracted_snippet?.original ?? '',
        rating: r.rating,
        time: Math.floor(new Date(r.iso_date).getTime() / 1000),
        source: 'google',
        status: 'pending',
        createdAt: now,
      })
      savedCount++
    }

    nextPageToken = data.serpapi_pagination?.next_page_token
    // Stop paginating when an entire page of reviews already exists
    if (allExist && reviews.length > 0) break
  } while (nextPageToken)

  return savedCount
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
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
  },
}
