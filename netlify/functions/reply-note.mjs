import { getStore } from '@netlify/blobs'
import { hasValidAdminSession } from './_admin-auth.mjs'

const STORE_NAME = 'yesmagic-config'
const KEY = 'reply-note'
const DEFAULT_NOTE = 'Thank you for shopping with YESMagic. We appreciate your support and will follow up with any updates as soon as possible.'

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
      const parsed = raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
      const note = String(parsed?.note ?? '').trim() || DEFAULT_NOTE
      return new Response(JSON.stringify({ note }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    } catch (err) {
      console.error('Reply note read error:', err)
      return new Response(JSON.stringify({ note: DEFAULT_NOTE }), {
        status: 200,
        headers: corsHeaders(origin),
      })
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

  const note = String(body?.note ?? '').trim()
  if (!note) {
    return new Response(JSON.stringify({ error: 'Reply note cannot be empty' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  try {
    const store = getStore(STORE_NAME)
    await store.set(KEY, JSON.stringify({ note }))
    return new Response(JSON.stringify({ ok: true, note }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Reply note write error:', err)
    return new Response(JSON.stringify({ error: 'Failed to save reply note' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/reply-note' }
