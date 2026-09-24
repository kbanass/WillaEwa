import { verifyAuth, unauthorized } from '../../_shared/auth'
import { sanityMutate } from '../../_shared/sanity'
import type { Env } from '../../_shared/env'
import { triggerRebuild, jsonError } from '../../_shared/http'

type ReviewStatus = 'pending' | 'accepted' | 'deleted'

const VALID_STATUSES: ReviewStatus[] = ['pending', 'accepted', 'deleted']

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  if (!(await verifyAuth(request, env))) return unauthorized()

  let reviews: { id: string; status: ReviewStatus }[]
  try {
    const body = (await request.json()) as {
      reviews?: { id: unknown; status: unknown }[]
    }
    if (!Array.isArray(body.reviews) || body.reviews.length === 0) {
      return jsonError('Brak danych', 400)
    }
    reviews = body.reviews.map((r) => {
      if (typeof r.id !== 'string' || !VALID_STATUSES.includes(r.status as ReviewStatus)) {
        throw new Error('Nieprawidłowe dane')
      }
      return { id: r.id, status: r.status as ReviewStatus }
    })
  } catch (e) {
    return jsonError((e as Error).message, 400)
  }

  const mutations = reviews.map((r) => ({
    patch: { id: r.id, set: { status: r.status } },
  }))

  await sanityMutate(env, mutations)

  await triggerRebuild(env)

  return Response.json({ success: true, updated: reviews.length })
}
