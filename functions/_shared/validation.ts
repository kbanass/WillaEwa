export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string }

// ── Links ─────────────────────────────────────────────────────────────────────

export function containsLink(text: string): boolean {
  return /https?:\/\//i.test(text)
}

// ── Review ────────────────────────────────────────────────────────────────────

export interface ReviewInput {
  author: string
  content: string
  rating: number
  email?: string
}

const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export function validateReview(body: Record<string, unknown>): ValidationResult<ReviewInput> {
  const author = typeof body.author === 'string' ? body.author.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const rating = typeof body.rating === 'number' ? body.rating : NaN
  const email = typeof body.email === 'string' ? body.email.trim() : undefined

  if (author.length < 2 || author.length > 100) {
    return { ok: false, error: 'Imię i nazwisko: 2–100 znaków' }
  }
  if (content.length < 2 || content.length > 1000) {
    return { ok: false, error: 'Opinia: 2–1000 znaków' }
  }
  if (containsLink(content)) {
    return { ok: false, error: 'Opinia nie może zawierać linków' }
  }
  if (!VALID_RATINGS.includes(rating)) {
    return { ok: false, error: 'Nieprawidłowa ocena' }
  }
  return { ok: true, data: { author, content, rating, email: email || undefined } }
}

// ── Inquiry ───────────────────────────────────────────────────────────────────

export interface InquiryInput {
  name: string
  email: string
  phone: string
  dateFrom: string
  dateTo: string
  adults: number
  childrenAges?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s+\-()]+$/

export function validateInquiry(body: Record<string, unknown>): ValidationResult<InquiryInput> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const dateFrom = typeof body.dateFrom === 'string' ? body.dateFrom.trim() : ''
  const dateTo = typeof body.dateTo === 'string' ? body.dateTo.trim() : ''
  const adults = typeof body.adults === 'number' ? body.adults : NaN
  const childrenAges =
    typeof body.childrenAges === 'string' ? body.childrenAges.trim() : undefined

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'Imię i nazwisko: 2–100 znaków' }
  }
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { ok: false, error: 'Nieprawidłowy e-mail' }
  }
  if (!PHONE_REGEX.test(phone) || phone.length > 20) {
    return { ok: false, error: 'Nieprawidłowy numer telefonu' }
  }
  const dateFromMs = new Date(dateFrom).getTime()
  const dateToMs = new Date(dateTo).getTime()
  if (isNaN(dateFromMs) || isNaN(dateToMs) || dateFromMs >= dateToMs) {
    return { ok: false, error: 'Nieprawidłowe daty' }
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 20) {
    return { ok: false, error: 'Liczba dorosłych: 1–20' }
  }
  if (childrenAges && (!/^[\d,\s]+$/.test(childrenAges) || childrenAges.length > 50)) {
    return { ok: false, error: 'Nieprawidłowy wiek dzieci' }
  }
  return {
    ok: true,
    data: { name, email, phone, dateFrom, dateTo, adults, childrenAges },
  }
}
