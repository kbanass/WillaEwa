import { verifyAuth } from '../../_shared/auth'
import type { Env } from '../../_shared/env'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const ok = await verifyAuth(context.request, context.env)
  if (!ok) return Response.json({ authenticated: false }, { status: 401 })
  return Response.json({ authenticated: true })
}
