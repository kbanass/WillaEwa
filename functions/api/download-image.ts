import type { Env } from '../_shared/env'

const ALLOWED_PREFIX = 'https://cdn.sanity.io/images/csed1mdo/'

export const onRequestGet = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
  const url = new URL(context.request.url).searchParams.get('url')

  if (!url || !url.startsWith(ALLOWED_PREFIX)) {
    return Response.json({ error: 'Nieprawidłowy URL' }, { status: 400 })
  }

  const res = await fetch(url)
  if (!res.ok) {
    return Response.json({ error: 'Błąd pobierania obrazu' }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  let ext = 'jpg'
  if (contentType.includes('webp')) ext = 'webp'
  else if (contentType.includes('png')) ext = 'png'

  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Content-Disposition', `attachment; filename="willa-ewa.${ext}"`)

  return new Response(res.body, { headers })
}
