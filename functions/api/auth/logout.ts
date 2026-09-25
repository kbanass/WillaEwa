import { verifyAuth, unauthorized } from '../../_shared/auth'
import type { Env } from '../../_shared/env'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ok = await verifyAuth(context.request, context.env)
  if (!ok) return unauthorized()

  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    'token=; HttpOnly; SameSite=Strict; Secure; Max-Age=0; Path=/',
  )
  return Response.json({ success: true }, { headers })
}
