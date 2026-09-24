import { verifyAuth, unauthorized } from '../../../_shared/auth'
import { sanityQuery, sanityMutate } from '../../../_shared/sanity'
import type { Env } from '../../../_shared/env'
import { triggerRebuild, jsonError } from '../../../_shared/http'

function getReviewSource(env: Env, id: string) {
  return sanityQuery<{ source: string } | null>(
    env,
    `*[_type == "review" && _id == $id][0]{ source }`,
    { id },
  )
}

export const onRequestDelete: PagesFunction<Env, 'id'> = async (context) => {
  const { request, env, params } = context
  if (!(await verifyAuth(request, env))) return unauthorized()

  const id = typeof params.id === 'string' ? params.id : ''
  if (!id) return jsonError('Brak ID', 400)

  // Only hard-delete page reviews — Google reviews can only be soft-deleted (via change-statuses)
  const review = await getReviewSource(env, id)

  if (!review) {
    return jsonError('Opinia nie istnieje', 404)
  }

  if (review.source === 'google') {
    return jsonError('Opinie Google można jedynie dezaktywować, nie usuwać trwale', 403)
  }

  await sanityMutate(env, [{ delete: { id } }])

  return Response.json({ success: true })
}

// Replies are only for reviews submitted on the site — replies to Google
// reviews are mirrored in from what the owner writes directly on Google Maps
// (see cron-worker), not authored here.
export const onRequestPatch: PagesFunction<Env, 'id'> = async (context) => {
  const { request, env, params } = context
  if (!(await verifyAuth(request, env))) return unauthorized()

  const id = typeof params.id === 'string' ? params.id : ''
  if (!id) return jsonError('Brak ID', 400)

  let reply: string
  try {
    const body = (await request.json()) as { reply?: unknown }
    if (typeof body.reply !== 'string') {
      return jsonError('Nieprawidłowe dane', 400)
    }
    reply = body.reply.trim()
  } catch {
    return jsonError('Nieprawidłowe dane', 400)
  }

  if (reply.length > 2000) {
    return jsonError('Odpowiedź: maksymalnie 2000 znaków', 400)
  }

  const review = await getReviewSource(env, id)

  if (!review) {
    return jsonError('Opinia nie istnieje', 404)
  }

  if (review.source !== 'page') {
    return jsonError('Na opinie Google nie można odpowiadać z panelu', 403)
  }

  await sanityMutate(env, [
    reply
      ? { patch: { id, set: { reply, replyTime: Math.floor(Date.now() / 1000) } } }
      : { patch: { id, unset: ['reply', 'replyTime'] } },
  ])

  await triggerRebuild(env)

  return Response.json({ success: true })
}
