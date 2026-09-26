import { sanityMutate } from '../_shared/sanity'
import {
  notifyAll,
  sendNewReviewNotification,
  sendNewReviewTelegram,
} from '../_shared/notifications'
import type { Env } from '../_shared/env'
import { jsonError } from '../_shared/http'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  let body: {
    author?: unknown
    content?: unknown
    rating?: unknown
    email?: unknown
    website?: unknown
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return jsonError('Nieprawidłowe dane', 400)
  }

  // Honeypot
  if (body.website) return Response.json({ success: true })

  const author = typeof body.author === 'string' ? body.author.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const rating = typeof body.rating === 'number' ? body.rating : NaN
  const email = typeof body.email === 'string' ? body.email.trim() : undefined

  if (author.length < 2 || author.length > 100) {
    return jsonError('Imię i nazwisko: 2–100 znaków', 400)
  }
  if (content.length < 2 || content.length > 1000) {
    return jsonError('Opinia: 2–1000 znaków', 400)
  }
  if (/https?:\/\//i.test(content)) {
    return jsonError('Opinia nie może zawierać linków', 400)
  }
  const validRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  if (isNaN(rating) || !validRatings.includes(rating)) {
    return jsonError('Nieprawidłowa ocena', 400)
  }

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
        email: email || undefined,
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
