import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import type { Env } from '../../_shared/env'
import { jsonError } from '../../_shared/http'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  let password: string
  try {
    const body = (await request.json()) as { password?: string }
    password = body.password ?? ''
  } catch {
    return jsonError('Nieprawidłowe dane', 400)
  }

  if (!password) {
    return jsonError('Brak hasła', 400)
  }

  const hash = env.ADMIN_PASSWORD_HASH
  if (!hash) {
    return jsonError('Błąd konfiguracji', 500)
  }

  const valid = await bcrypt.compare(password, hash)
  if (!valid) {
    return jsonError('Nieprawidłowe hasło', 401)
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
