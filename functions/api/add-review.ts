import { sanityMutate } from '../_shared/sanity'
import { sendNewReviewNotification, sendNewReviewTelegram } from '../_shared/notifications'
import type { Env } from '../_shared/env'

export const onRequestPost = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
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
    return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }

  // Honeypot
  if (body.website) return Response.json({ success: true })

  const author = typeof body.author === 'string' ? body.author.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const rating = typeof body.rating === 'number' ? body.rating : NaN
  const email = typeof body.email === 'string' ? body.email.trim() : undefined

  if (author.length < 2 || author.length > 100) {
    return Response.json({ error: 'Imię i nazwisko: 2–100 znaków' }, { status: 400 })
  }
  if (content.length < 2 || content.length > 1000) {
    return Response.json({ error: 'Opinia: 2–1000 znaków' }, { status: 400 })
  }
  if (/https?:\/\//i.test(content)) {
    return Response.json({ error: 'Opinia nie może zawierać linków' }, { status: 400 })
  }
  const validRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  if (isNaN(rating) || !validRatings.includes(rating)) {
    return Response.json({ error: 'Nieprawidłowa ocena' }, { status: 400 })
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

  await Promise.allSettled([
    sendNewReviewNotification(env, { author, rating, quote: content }),
    sendNewReviewTelegram(env, { author, rating, quote: content }),
  ])

  return Response.json({ success: true })
}
