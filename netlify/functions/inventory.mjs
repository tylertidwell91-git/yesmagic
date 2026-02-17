import { getStore } from '@netlify/blobs'

const DEFAULT_INVENTORY = [
  { id: '1', price: 29.99, quantity: 50, shipping: 0, image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop', series: 'Dominaria', item: 'Booster Box', description: '36 booster packs from the Dominaria United set.' },
  { id: '2', price: 49.99, quantity: 30, shipping: 0, image: 'https://images.unsplash.com/photo-1580421598329-f84c6dbb0f33?w=400&h=400&fit=crop', series: 'Innistrad', item: 'Bundle', description: 'Set bundle with boosters, lands, and storage box.' },
  { id: '3', price: 79.99, quantity: 20, shipping: 0, image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&h=400&fit=crop', series: 'Zendikar', item: 'Draft Kit', description: 'Draft kit with boosters and accessories for limited play.' },
]

const STORE_NAME = 'yesmagic-inventory'
const KEY = 'inventory'

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
      let list = data != null && Array.isArray(data) && data.length > 0 ? data : DEFAULT_INVENTORY
      list = list.map((p) => ({
        ...p,
        shipping: Math.max(0, Number(p.shipping) ?? 0),
      }))
      return new Response(JSON.stringify({ inventory: list }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    } catch (err) {
      console.error('Inventory read error:', err)
      return new Response(JSON.stringify({ inventory: DEFAULT_INVENTORY }), {
        status: 200,
        headers: corsHeaders(origin),
      })
    }
  }

  // PUT
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()
  let body
  try {
    body = await req.json()
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }
  const sent = typeof body?.adminPassword === 'string' ? body.adminPassword.trim() : ''
  if (!adminPassword || sent !== adminPassword) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders(origin),
    })
  }
  if (!Array.isArray(body?.products)) {
    return new Response(JSON.stringify({ error: 'Invalid payload: products must be an array' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  try {
    const store = getStore(STORE_NAME)
    const normalized = body.products.map((p) => ({
      id: String(p.id ?? ''),
      price: Math.max(0, Number(p.price) ?? 0),
      quantity: Math.max(0, Math.floor(Number(p.quantity) ?? 0)),
      shipping: Math.max(0, Number(p.shipping) ?? 0),
      image:
        String(p.image ?? '').trim() ||
        'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop',
      series: String(p.series ?? '').trim(),
      item: String(p.item ?? '').trim(),
      description: String(p.description ?? '').trim(),
    }))
    await store.set(KEY, JSON.stringify(normalized))
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Inventory write error:', err)
    return new Response(JSON.stringify({ error: 'Failed to save inventory' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/inventory' }
