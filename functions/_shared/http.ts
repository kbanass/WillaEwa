import type { Env } from './env'

export function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status })
}

/** Starts a Cloudflare Pages rebuild so content changes reach the static site. */
export async function triggerRebuild(env: Env): Promise<void> {
  if (!env.CF_PAGES_DEPLOY_HOOK) return
  await fetch(env.CF_PAGES_DEPLOY_HOOK, { method: 'POST' }).catch(() => {})
}
