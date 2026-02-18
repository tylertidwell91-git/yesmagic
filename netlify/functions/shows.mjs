import { getStore } from '@netlify/blobs'
import { hasValidAdminSession } from './_admin-auth.mjs'

const STORE_NAME = 'yesmagic-inventory'
const KEY = 'shows'

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Content-Type': 'application/json',
  }
}

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(origin),
    })
  }

  if (req.method === 'GET') {
    try {
      const store = getStore(STORE_NAME)
      const raw = await store.get(KEY, { consistency: 'strong' })
      const data = raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
      const list = Array.isArray(data) ? data : []
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: corsHeaders(origin),
      })
    } catch (err) {
      console.error('Shows read error:', err)
      return new Response(JSON.stringify([]), { status: 200, headers: corsHeaders(origin) })
    }
  }

  let body
  try {
    body = await req.json()
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }
  if (!hasValidAdminSession(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders(origin),
    })
  }
  if (!Array.isArray(body?.shows)) {
    return new Response(JSON.stringify({ error: 'Invalid payload: shows must be an array' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  try {
    const store = getStore(STORE_NAME)
    const normalized = body.shows.map((s) => ({
      id: String(s.id ?? ''),
      date: String(s.date ?? '').trim(),
      time: String(s.time ?? '').trim(),
      title: String(s.title ?? '').trim(),
    }))
    await store.set(KEY, JSON.stringify(normalized))
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Shows write error:', err)
    return new Response(JSON.stringify({ error: 'Failed to save shows' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/shows' }
