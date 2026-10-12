import { sanityMutate } from '../_shared/sanity'
import {
  notifyAll,
  sendNewReviewNotification,
  sendNewReviewTelegram,
} from '../_shared/notifications'
import type { Env } from '../_shared/env'
import { jsonError } from '../_shared/http'
import { validateReview } from '../_shared/validation'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonError('Nieprawidłowe dane', 400)
  }

  // Honeypot
  if (body.website) return Response.json({ success: true })

  const result = validateReview(body)
  if (!result.ok) return jsonError(result.error, 400)
  const { author, content, rating, email } = result.data

  const now = Math.floor(Date.now() / 1000)
  await sanityMutate(env, [
    {
      create: {
        _type: 'review',
        author,
        quote: content,
        rating,
        source: 'page',
        status: 'pending',
        email,
        time: now,
        createdAt: now,
      },
    },
  ])

  await notifyAll('add-review', [
    sendNewReviewNotification(env, { author, rating, quote: content }),
    sendNewReviewTelegram(env, { author, rating, quote: content }),
  ])

  return Response.json({ success: true })
}
