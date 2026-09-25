import type { Env } from '../_shared/env'
import { jsonError } from '../_shared/http'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url).searchParams.get('url')

  // Only images from our own Sanity project — not an open proxy.
  const allowedPrefix = `https://cdn.sanity.io/images/${context.env.SANITY_PROJECT_ID}/`
  if (!url || !url.startsWith(allowedPrefix)) {
    return jsonError('Nieprawidłowy URL', 400)
  }

  const res = await fetch(url, {
    headers: { Accept: 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8' },
  })
  if (!res.ok) {
    return jsonError('Błąd pobierania obrazu', 502)
  }

  const rawType = res.headers.get('content-type') ?? ''
  const contentType = rawType.startsWith('image/') ? rawType : 'image/jpeg'
  let ext = 'jpg'
  if (contentType.includes('webp')) ext = 'webp'
  else if (contentType.includes('png')) ext = 'png'
  else if (contentType.includes('avif')) ext = 'avif'

  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Content-Disposition', `attachment; filename="willa-ewa.${ext}"`)

  return new Response(res.body, { headers })
}
