import { getStore } from '@netlify/blobs'
import { hasValidAdminSession } from './_admin-auth.mjs'

const STORE_NAME = 'yesmagic-inventory'
const KEY = 'email-subscribers'

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function normalizeAddress(address) {
  if (!address) return ''
  return String(address)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (!['GET', 'POST', 'PUT'].includes(req.method)) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(origin),
    })
  }

  const store = getStore(STORE_NAME)

  if (req.method === 'GET') {
    // Admin-only: list all subscribers
    if (!hasValidAdminSession(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders(origin),
      })
    }
    try {
      const raw = await store.get(KEY, { consistency: 'strong' })
      const data = raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
      const list = Array.isArray(data) ? data : []
      return new Response(JSON.stringify({ subscribers: list }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    } catch (err) {
      console.error('Email-subscribers read error:', err)
      return new Response(JSON.stringify({ subscribers: [] }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    }
  }

  // POST: public subscribe
  if (req.method === 'POST') {
    let body
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const shippingAddress = String(body?.shippingAddress ?? '').trim()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }
    if (!shippingAddress) {
      return new Response(JSON.stringify({ error: 'Shipping address is required.' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    const shippingKey = normalizeAddress(shippingAddress)
    if (!shippingKey) {
      return new Response(JSON.stringify({ error: 'Shipping address is required.' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    try {
      const raw = await store.get(KEY, { consistency: 'strong' })
      const existing = raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
      const list = Array.isArray(existing) ? existing : []

      const now = new Date().toISOString()
      const idx = list.findIndex((s) => normalizeAddress(s.shippingAddress) === shippingKey)

      if (idx >= 0) {
        // Update existing entry for this shipping address
        const current = list[idx]
        list[idx] = {
          ...current,
          name: name || current.name || '',
          email,
          shippingAddress,
          updatedAt: now,
        }
      } else {
        list.push({
          id: body?.id ? String(body.id) : String(Date.now()) + Math.random().toString(36).slice(2),
          name,
          email,
          shippingAddress,
          createdAt: now,
          updatedAt: now,
        })
      }

      await store.set(KEY, JSON.stringify(list))
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    } catch (err) {
      console.error('Email-subscribers write error (POST):', err)
      return new Response(JSON.stringify({ error: 'Failed to save subscription.' }), {
        status: 500,
        headers: corsHeaders(origin),
      })
    }
  }

  // PUT: admin-only full update
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
  if (!Array.isArray(body?.subscribers)) {
    return new Response(JSON.stringify({ error: 'Invalid payload: subscribers must be an array' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  try {
    const now = new Date().toISOString()
    const normalized = body.subscribers.map((s) => ({
      id: String(s.id ?? '') || String(Date.now()) + Math.random().toString(36).slice(2),
      name: String(s.name ?? '').trim(),
      email: String(s.email ?? '').trim(),
      shippingAddress: String(s.shippingAddress ?? '').trim(),
      createdAt: s.createdAt ? String(s.createdAt) : now,
      updatedAt: now,
    }))
    await store.set(KEY, JSON.stringify(normalized))
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Email-subscribers write error (PUT):', err)
    return new Response(JSON.stringify({ error: 'Failed to save subscribers.' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/email-subscribers' }

