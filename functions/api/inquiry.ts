import {
  notifyAll,
  sendInquiryNotification,
  sendInquiryTelegram,
} from '../_shared/notifications'
import type { Env } from '../_shared/env'
import { jsonError } from '../_shared/http'
import { validateInquiry } from '../_shared/validation'

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

  const result = validateInquiry(body)
  if (!result.ok) return jsonError(result.error, 400)
  const data = result.data

  await notifyAll('inquiry', [
    sendInquiryNotification(env, data),
    sendInquiryTelegram(env, data),
  ])

  return Response.json({ success: true })
}
