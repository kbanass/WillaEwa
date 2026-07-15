import { jwtVerify } from 'jose'
import type { Env } from './env'

export async function verifyAuth(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get('Cookie') ?? ''
  const token = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('token='))
    ?.slice('token='.length)

  if (!token) return false

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export function unauthorized(redirect = false): Response {
  if (redirect) {
    return Response.redirect('/login', 302)
  }
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
