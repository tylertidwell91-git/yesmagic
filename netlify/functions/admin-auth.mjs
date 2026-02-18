import { createAdminToken, hasValidAdminSession } from './_admin-auth.mjs'

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }
}

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method === 'GET') {
    const authenticated = hasValidAdminSession(req)
    return new Response(JSON.stringify({ authenticated }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  }

  if (req.method === 'DELETE') {
    const headers = {
      ...corsHeaders(origin),
      'Set-Cookie': 'ym_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(origin),
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  const password = typeof body?.password === 'string' ? body.password.trim() : ''
  const expected = (process.env.ADMIN_PASSWORD || '').trim()
  if (!expected || !password || password !== expected) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: corsHeaders(origin),
    })
  }

  const token = createAdminToken()
  const headers = {
    ...corsHeaders(origin),
    'Set-Cookie': `ym_admin=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`,
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  })
}

export const config = { path: '/api/admin-auth' }

