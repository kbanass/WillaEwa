/**
 * One-time migration: SQLite reviews → Sanity
 *
 * Usage (from repo root):
 *   DB_PATH=/path/to/willa-ewa.db \
 *   SANITY_PROJECT_ID=csed1mdo \
 *   SANITY_DATASET=production \
 *   SANITY_API_TOKEN=<write token> \
 *   npx tsx scripts/migrate-reviews.ts
 *
 * Requires better-sqlite3 — run from the server/ directory if it's not at root:
 *   cd server && DB_PATH=../data/willa-ewa.db ... npx tsx ../scripts/migrate-reviews.ts
 */

import Database from 'better-sqlite3'

const { DB_PATH, SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN } = process.env

if (!DB_PATH || !SANITY_PROJECT_ID || !SANITY_DATASET || !SANITY_API_TOKEN) {
  console.error('Missing required env vars: DB_PATH, SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN')
  process.exit(1)
}

interface SqliteReview {
  id: number
  googleReviewId: string | null
  author: string
  quote: string
  rating: number
  time: number
  source: string
  status: string
  email: string | null
  createdAt: number
}

const SANITY_API_VERSION = '2024-01-01'
const BATCH_SIZE = 50

async function sanityMutateBatch(mutations: unknown[]): Promise<void> {
  const res = await fetch(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SANITY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mutations }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sanity mutate failed (${res.status}): ${text}`)
  }
}

async function main(): Promise<void> {
  const db = new Database(DB_PATH!)
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY time ASC').all() as SqliteReview[]
  db.close()

  console.log(`Found ${reviews.length} reviews in SQLite`)

  let migrated = 0
  let skipped = 0

  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE)
    const mutations = batch.map((r) => ({
      create: {
        _type: 'review',
        author: r.author,
        quote: r.quote,
        rating: r.rating,
        time: r.time,
        source: r.source,
        status: r.status,
        ...(r.googleReviewId ? { googleReviewId: r.googleReviewId } : {}),
        ...(r.email ? { email: r.email } : {}),
        createdAt: r.createdAt,
      },
    }))

    try {
      await sanityMutateBatch(mutations)
      migrated += batch.length
      console.log(`Migrated ${migrated}/${reviews.length}...`)
    } catch (err) {
      console.error(`Batch ${i}–${i + batch.length} failed:`, err)
      skipped += batch.length
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
