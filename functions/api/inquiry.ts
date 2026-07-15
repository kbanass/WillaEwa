import { sendInquiryNotification, sendInquiryTelegram } from '../_shared/notifications'
import type { Env } from '../_shared/env'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s+\-()]+$/

export const onRequestPost = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
  const { request, env } = context

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }

  // Honeypot
  if (body.website) return Response.json({ success: true })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const dateFrom = typeof body.dateFrom === 'string' ? body.dateFrom.trim() : ''
  const dateTo = typeof body.dateTo === 'string' ? body.dateTo.trim() : ''
  const adults = typeof body.adults === 'number' ? body.adults : NaN
  const childrenAges =
    typeof body.childrenAges === 'string' ? body.childrenAges.trim() : undefined

  if (name.length < 2 || name.length > 100) {
    return Response.json({ error: 'Imię i nazwisko: 2–100 znaków' }, { status: 400 })
  }
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return Response.json({ error: 'Nieprawidłowy e-mail' }, { status: 400 })
  }
  if (!PHONE_REGEX.test(phone) || phone.length > 20) {
    return Response.json({ error: 'Nieprawidłowy numer telefonu' }, { status: 400 })
  }
  const dateFromMs = new Date(dateFrom).getTime()
  const dateToMs = new Date(dateTo).getTime()
  if (isNaN(dateFromMs) || isNaN(dateToMs) || dateFromMs >= dateToMs) {
    return Response.json({ error: 'Nieprawidłowe daty' }, { status: 400 })
  }
  if (isNaN(adults) || !Number.isInteger(adults) || adults < 1 || adults > 20) {
    return Response.json({ error: 'Liczba dorosłych: 1–20' }, { status: 400 })
  }
  if (childrenAges && (!/^[\d,\s]+$/.test(childrenAges) || childrenAges.length > 50)) {
    return Response.json({ error: 'Nieprawidłowy wiek dzieci' }, { status: 400 })
  }

  const data = { name, email, phone, dateFrom, dateTo, adults, childrenAges }

  await Promise.allSettled([
    sendInquiryNotification(env, data),
    sendInquiryTelegram(env, data),
  ])

  return Response.json({ success: true })
}
