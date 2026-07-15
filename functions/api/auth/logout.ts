import { verifyAuth } from '../../_shared/auth'
import type { Env } from '../../_shared/env'

export const onRequestPost = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
  const ok = await verifyAuth(context.request, context.env)
  if (!ok) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    'token=; HttpOnly; SameSite=Strict; Secure; Max-Age=0; Path=/',
  )
  return Response.json({ success: true }, { headers })
}
