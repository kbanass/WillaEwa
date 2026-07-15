import type { Env } from '../_shared/env'

export const onRequestPost = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
  const { request, env } = context

  if (env.REBUILD_SECRET) {
    const provided = request.headers.get('x-rebuild-secret')
    if (provided !== env.REBUILD_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!env.CF_PAGES_DEPLOY_HOOK) {
    return Response.json({ error: 'Deploy hook not configured' }, { status: 500 })
  }

  // Fire-and-forget — Cloudflare handles the build
  context.request.signal?.throwIfAborted()
  fetch(env.CF_PAGES_DEPLOY_HOOK, { method: 'POST' }).catch(() => {})

  return Response.json({ message: 'Deploy triggered' }, { status: 202 })
}
