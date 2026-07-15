import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import type { Env } from '../../_shared/env'

export const onRequestPost = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
  const { request, env } = context

  let password: string
  try {
    const body = (await request.json()) as { password?: string }
    password = body.password ?? ''
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }

  if (!password) {
    return Response.json({ error: 'Brak hasła' }, { status: 400 })
  }

  const hash = env.ADMIN_PASSWORD_HASH
  if (!hash) {
    return Response.json({ error: 'Błąd konfiguracji' }, { status: 500 })
  }

  const valid = await bcrypt.compare(password, hash)
  if (!valid) {
    return Response.json({ error: 'Nieprawidłowe hasło' }, { status: 401 })
  }

  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('72h')
    .sign(secret)

  const maxAge = 72 * 3600
  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    `token=${token}; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAge}; Path=/`,
  )
  return Response.json({ success: true }, { headers })
}
