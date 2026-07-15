import type { Env } from './env'

const API_VERSION = '2024-01-01'

function base(env: Env): string {
  return `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${API_VERSION}/data`
}

export async function sanityQuery<T = unknown>(
  env: Env,
  groq: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${base(env)}/query/${env.SANITY_DATASET}`)
  url.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(`$${k}`, JSON.stringify(v))
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.SANITY_API_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`)
  const data = (await res.json()) as { result: T }
  return data.result
}

export async function sanityMutate(
  env: Env,
  mutations: unknown[],
): Promise<void> {
  const res = await fetch(`${base(env)}/mutate/${env.SANITY_DATASET}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SANITY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sanity mutate failed: ${res.status} ${text}`)
  }
}
