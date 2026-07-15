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
