import { verifyAuth, unauthorized } from '../../../_shared/auth'
import { sanityQuery, sanityMutate } from '../../../_shared/sanity'
import type { Env } from '../../../_shared/env'

export const onRequestDelete = async (context: {
  request: Request
  env: Env
  params: Record<string, string>
}): Promise<Response> => {
  const { request, env, params } = context
  if (!(await verifyAuth(request, env))) return unauthorized()

  const id = params.id
  if (!id) return Response.json({ error: 'Brak ID' }, { status: 400 })

  // Only hard-delete page reviews — Google reviews can only be soft-deleted (via change-statuses)
  const review = await sanityQuery<{ source: string } | null>(
    env,
    `*[_type == "review" && _id == $id][0]{ source }`,
    { id },
  )

  if (!review) {
    return Response.json({ error: 'Opinia nie istnieje' }, { status: 404 })
  }

  if (review.source === 'google') {
    return Response.json(
      { error: 'Opinie Google można jedynie dezaktywować, nie usuwać trwale' },
      { status: 403 },
    )
  }

  await sanityMutate(env, [{ delete: { id } }])

  return Response.json({ success: true })
}

// Replies are only for reviews submitted on the site — replies to Google
// reviews are mirrored in from what the owner writes directly on Google Maps
// (see cron-worker), not authored here.
export const onRequestPatch = async (context: {
  request: Request
  env: Env
  params: Record<string, string>
}): Promise<Response> => {
  const { request, env, params } = context
  if (!(await verifyAuth(request, env))) return unauthorized()

  const id = params.id
  if (!id) return Response.json({ error: 'Brak ID' }, { status: 400 })

  let reply: string
  try {
    const body = (await request.json()) as { reply?: unknown }
    if (typeof body.reply !== 'string') {
      return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
    }
    reply = body.reply.trim()
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }

  if (reply.length > 2000) {
    return Response.json({ error: 'Odpowiedź: maksymalnie 2000 znaków' }, { status: 400 })
  }

  const review = await sanityQuery<{ source: string } | null>(
    env,
    `*[_type == "review" && _id == $id][0]{ source }`,
    { id },
  )

  if (!review) {
    return Response.json({ error: 'Opinia nie istnieje' }, { status: 404 })
  }

  if (review.source !== 'page') {
    return Response.json(
      { error: 'Na opinie Google nie można odpowiadać z panelu' },
      { status: 403 },
    )
  }

  await sanityMutate(env, [
    reply
      ? { patch: { id, set: { reply, replyTime: Math.floor(Date.now() / 1000) } } }
      : { patch: { id, unset: ['reply', 'replyTime'] } },
  ])

  if (env.CF_PAGES_DEPLOY_HOOK) {
    await fetch(env.CF_PAGES_DEPLOY_HOOK, { method: 'POST' }).catch(() => {})
  }

  return Response.json({ success: true })
}
