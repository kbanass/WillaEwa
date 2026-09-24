import type { Env } from '../_shared/env'
import { triggerRebuild, jsonError } from '../_shared/http'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (env.REBUILD_SECRET) {
    const provided = request.headers.get('x-rebuild-secret')
    if (provided !== env.REBUILD_SECRET) {
      return jsonError('Unauthorized', 401)
    }
  }

  if (!env.CF_PAGES_DEPLOY_HOOK) {
    return jsonError('Deploy hook not configured', 500)
  }

  // Respond right away; the hook call finishes in the background.
  context.waitUntil(triggerRebuild(env))

  return Response.json({ message: 'Deploy triggered' }, { status: 202 })
}
