import nodemailer from 'nodemailer'

const port = Number(process.env.SMTP_PORT) || 587
const secure = process.env.SMTP_SECURE === 'true'
const transporter =
  process.env.SMTP_HOST || process.env.SMTP_USER
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        requireTLS: !secure && port === 587,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        auth:
          process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      })
    : null

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] || '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

async function verifyBearerUser(supabaseUrl, anonKey, accessToken) {
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  })
  if (!r.ok) return null
  return r.json()
}

async function restSelectOne(url, serviceKey, pathWithQuery) {
  const r = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  })
  if (!r.ok) return { error: await r.text(), data: null }
  const rows = await r.json()
  return { error: null, data: Array.isArray(rows) ? rows[0] : rows }
}

async function adminGetUserEmail(supabaseUrl, serviceKey, userId) {
  const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })
  if (!r.ok) return null
  const j = await r.json()
  return (j && j.email) || (j && j.user && j.user.email) || null
}

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(origin),
    })
  }

  const supabaseUrl = (process.env.SPELLBOOK_SUPABASE_URL || '').replace(/\/+$/, '')
  const anonKey = process.env.SPELLBOOK_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.SPELLBOOK_SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(
      JSON.stringify({
        error:
          'Server missing SPELLBOOK_SUPABASE_URL, SPELLBOOK_SUPABASE_ANON_KEY, or SPELLBOOK_SUPABASE_SERVICE_ROLE_KEY.',
      }),
      { status: 503, headers: corsHeaders(origin) }
    )
  }

  const authHeader = req.headers.get('authorization') || ''
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  const accessToken = m ? m[1].trim() : ''
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Missing Authorization Bearer token' }), {
      status: 401,
      headers: corsHeaders(origin),
    })
  }

  try {
    const user = await verifyBearerUser(supabaseUrl, anonKey, accessToken)
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: corsHeaders(origin),
      })
    }

    const body = await req.json()
    const offerId = String(body?.offer_id || '').trim()
    const spellbookOrigin = String(body?.spellbook_origin || process.env.SPELLBOOK_PUBLIC_URL || '').replace(
      /\/+$/,
      ''
    )

    if (!offerId) {
      return new Response(JSON.stringify({ error: 'offer_id required' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    const { error: e1, data: offer } = await restSelectOne(
      supabaseUrl,
      serviceKey,
      `trade_offers?id=eq.${offerId}&select=id,proposer_id,listing_id,mode,status`
    )
    if (e1 || !offer) {
      return new Response(JSON.stringify({ error: 'Offer not found' }), {
        status: 404,
        headers: corsHeaders(origin),
      })
    }

    if (offer.proposer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders(origin) })
    }

    const { error: e2, data: listing } = await restSelectOne(
      supabaseUrl,
      serviceKey,
      `trade_listings?id=eq.${offer.listing_id}&select=id,seller_id,card`
    )
    if (e2 || !listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: corsHeaders(origin),
      })
    }

    const sellerEmail = await adminGetUserEmail(supabaseUrl, serviceKey, listing.seller_id)
    if (!sellerEmail) {
      return new Response(JSON.stringify({ error: 'Could not resolve seller email' }), {
        status: 502,
        headers: corsHeaders(origin),
      })
    }

    const cardName =
      listing.card && typeof listing.card === 'object' && listing.card.name ? String(listing.card.name) : 'a listed card'
    const proposerLabel = user.email || 'A Spellbook member'
    const openUrl = spellbookOrigin ? `${spellbookOrigin}/` : 'https://spellbook.yesmagicshop.com/'

    const text = [
      `Hi,`,
      ``,
      `${proposerLabel} proposed a trade for: ${cardName}.`,
      `Mode: ${offer.mode === 'mediated' ? 'YesMagic mediated' : 'Peer-to-peer'}.`,
      ``,
      `Open The Spellbook to review and reply in your Inbox:`,
      openUrl,
      ``,
      `— The Spellbook (YesMagic)`,
    ].join('\n')

    if (!transporter) {
      console.warn('spellbook-trade-offer-email: SMTP not configured')
      return new Response(
        JSON.stringify({
          error:
            'Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) on Netlify.',
        }),
        { status: 503, headers: corsHeaders(origin) }
      )
    }

    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'spellbook@yesmagic.local'

    await transporter.sendMail({
      from: fromAddr,
      to: sellerEmail,
      subject: `New trade offer: ${cardName}`,
      text,
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders(origin) })
  } catch (err) {
    console.error('spellbook-trade-offer-email', err)
    return new Response(JSON.stringify({ error: err.message || 'Failed to send' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/spellbook-trade-offer-email' }
