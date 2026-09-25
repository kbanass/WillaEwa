import { verifyAuth, unauthorized } from '../../_shared/auth'
import { sanityQuery } from '../../_shared/sanity'
import type { Env } from '../../_shared/env'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  if (!(await verifyAuth(request, env))) return unauthorized()

  const reviews = await sanityQuery<unknown[]>(
    env,
    `*[_type == "review"] | order(time desc) {
      "id": _id,
      author,
      quote,
      rating,
      source,
      status,
      time,
      createdAt,
      email,
      googleReviewId,
      reply,
      replyTime,
    }`,
  )

  return Response.json({ reviews })
}
