import { createHmac, timingSafeEqual } from 'crypto'

function getSecret() {
  const secret = (process.env.ADMIN_PASSWORD || '').trim()
  if (!secret) throw new Error('ADMIN_PASSWORD is not configured.')
  return secret
}

function sign(payload) {
  const secret = getSecret()
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verify(token) {
  if (!token || typeof token !== 'string') return null
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  const secret = getSecret()
  const expected = createHmac('sha256', secret).update(data).digest('base64url')
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let payload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (payload && typeof payload.exp === 'number' && Date.now() > payload.exp) return null
  return payload
}

export function createAdminToken() {
  const oneHour = 60 * 60 * 1000
  const payload = { sub: 'admin', exp: Date.now() + oneHour }
  return sign(payload)
}

export function hasValidAdminSession(req) {
  const cookie = req.headers.get('cookie') || ''
  const parts = cookie.split(';').map((c) => c.trim())
  const pair = parts.find((p) => p.startsWith('ym_admin='))
  if (!pair) return false
  const token = pair.split('=')[1]
  const payload = verify(token)
  return !!payload && payload.sub === 'admin'
}

export function clearAdminCookieHeaders(origin, extraHeaders = {}) {
  return {
    ...extraHeaders,
    'Set-Cookie': 'ym_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
  }
}

