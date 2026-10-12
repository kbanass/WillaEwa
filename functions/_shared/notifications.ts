import escapeHtml from 'escape-html'
import type { Env } from './env'

// Notification bodies below interpolate user-submitted fields (review
// author/quote, inquiry name/dates) straight from public, unauthenticated
// forms — escape them in both the HTML email and the Telegram message
// (sent with parse_mode HTML) so a crafted submission can't inject markup.

// Notifications never fail the request that triggered them, but a failed
// one has to show up in the Functions logs (Cloudflare dashboard → Pages
// project → Functions → real-time logs) instead of disappearing silently.
export async function notifyAll(label: string, tasks: Promise<void>[]): Promise<void> {
  for (const result of await Promise.allSettled(tasks)) {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : result.reason
      console.error(`[${label}] notification failed: ${reason}`)
    }
  }
}

async function ensureOk(service: string, res: Response): Promise<void> {
  if (!res.ok) throw new Error(`${service} responded ${res.status}: ${await res.text()}`)
}

// ── Email ─────────────────────────────────────────────────────────────────────

export interface NewReview {
  author: string
  rating: number
  quote: string
}

export interface Inquiry {
  name: string
  email: string
  phone: string
  dateFrom: string
  dateTo: string
  adults: number
  childrenAges?: string
}

export async function sendEmail(
  env: Env,
  opts: { to: string; subject: string; html: string },
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    throw new Error('e-mail not sent: RESEND_API_KEY or MAIL_FROM is not set')
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  })
  await ensureOk('Resend', res)
}

export async function sendNewReviewNotification(
  env: Env,
  review: NewReview,
): Promise<void> {
  const domain = env.DOMAIN_NAME || 'willaewanadmorzem.pl'
  await sendEmail(env, {
    to: env.OWNER_EMAIL,
    subject: `Nowa opinia – ${review.author}`,
    html: `
      <table>
        <tr><td>Autor</td><td><strong>${escapeHtml(review.author)}</strong></td></tr>
        <tr><td>Ocena</td><td>${review.rating} / 5</td></tr>
        <tr><td>Treść</td><td>${escapeHtml(review.quote)}</td></tr>
      </table>
      <p><a href="https://${domain}/panel">Przejdź do panelu</a></p>
    `,
  })
}

export async function sendInquiryNotification(
  env: Env,
  data: Inquiry,
): Promise<void> {
  await sendEmail(env, {
    to: env.OWNER_EMAIL,
    subject: `Zapytanie o dostępność – ${data.name} (${data.dateFrom} → ${data.dateTo})`,
    html: `
      <table>
        <tr><td>Imię i nazwisko</td><td><strong>${escapeHtml(data.name)}</strong></td></tr>
        <tr><td>E-mail</td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td>Telefon</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td>Od</td><td>${escapeHtml(data.dateFrom)}</td></tr>
        <tr><td>Do</td><td>${escapeHtml(data.dateTo)}</td></tr>
        <tr><td>Dorośli</td><td>${data.adults}</td></tr>
        ${data.childrenAges ? `<tr><td>Dzieci (wiek)</td><td>${escapeHtml(data.childrenAges)}</td></tr>` : ''}
      </table>
    `,
  })
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegram(env: Env, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000))
  }
  for (const chunk of chunks) {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: chunk,
          parse_mode: 'HTML',
        }),
      },
    )
    await ensureOk('Telegram', res)
  }
}

export async function sendNewReviewTelegram(
  env: Env,
  review: NewReview,
): Promise<void> {
  const stars = '⭐'.repeat(Math.round(review.rating))
  await sendTelegram(
    env,
    `<b>Nowa opinia</b>\n${stars} (${review.rating})\n<b>${escapeHtml(review.author)}</b>\n${escapeHtml(review.quote)}`,
  )
}

export async function sendInquiryTelegram(
  env: Env,
  data: Inquiry,
): Promise<void> {
  await sendTelegram(
    env,
    `<b>Zapytanie o dostępność</b>\n` +
      `<b>${escapeHtml(data.name)}</b>\n` +
      `📅 ${escapeHtml(data.dateFrom)} → ${escapeHtml(data.dateTo)}\n` +
      `👥 Dorośli: ${data.adults}${data.childrenAges ? `, dzieci: ${escapeHtml(data.childrenAges)}` : ''}\n` +
      `📧 ${escapeHtml(data.email)}\n📞 ${escapeHtml(data.phone)}`,
  )
}
