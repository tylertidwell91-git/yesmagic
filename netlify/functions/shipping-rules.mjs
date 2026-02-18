import { getStore } from '@netlify/blobs'
import { hasValidAdminSession } from './_admin-auth.mjs'

const STORE_NAME = 'yesmagic-config'
const KEY = 'shipping-rules'

/** Default tiers: per item type, array of { min, max, price, perUnit }.
 *  perUnit: true = price × quantity for that type; false = flat rate for the tier. */
const DEFAULT_RULES = {
  'Play Booster Pack': [
    { min: 1, max: 4, price: 0.95, perUnit: false },
    { min: 6, max: 9, price: 3, perUnit: false },
    { min: 10, max: 19, price: 6, perUnit: false },
    { min: 20, max: null, price: 10, perUnit: false },
  ],
  'Collector Booster Pack': [
    { min: 1, max: 5, price: 4.99, perUnit: false },
    { min: 6, max: null, price: 10, perUnit: false },
  ],
  'Collector Box': [{ min: 1, max: null, price: 11, perUnit: true }],
  'Commander Deck': [
    { min: 1, max: 2, price: 4.9, perUnit: false },
    { min: 3, max: null, price: 11, perUnit: false },
  ],
  'Single Card': [
    { min: 1, max: 15, price: 2.99, perUnit: false },
    { min: 16, max: null, price: 8, perUnit: false },
  ],
}

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

function normalizeTier(t) {
  const min = Math.max(0, Math.floor(Number(t.min) ?? 0))
  const max = t.max == null || t.max === '' ? null : Math.max(min, Math.floor(Number(t.max) ?? 0))
  const price = Math.max(0, Number(t.price) ?? 0)
  const perUnit = Boolean(t.perUnit)
  return { min, max, price, perUnit }
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
      const rules = data && typeof data === 'object' && Object.keys(data).length > 0
        ? data
        : DEFAULT_RULES
      return new Response(JSON.stringify({ rules }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    } catch (err) {
      console.error('Shipping rules read error:', err)
      return new Response(JSON.stringify({ rules: DEFAULT_RULES }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    }
  }

  // PUT
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
  if (!body.rules || typeof body.rules !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid payload: rules must be an object' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  try {
    const store = getStore(STORE_NAME)
    const normalized = {}
    for (const [itemType, tiers] of Object.entries(body.rules)) {
      const key = String(itemType).trim()
      if (!key) continue
      if (!Array.isArray(tiers)) continue
      normalized[key] = tiers.map(normalizeTier).filter((t) => t.min >= 0 && t.price >= 0)
    }
    await store.set(KEY, JSON.stringify(normalized))
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Shipping rules write error:', err)
    return new Response(JSON.stringify({ error: 'Failed to save shipping rules' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/shipping-rules' }
