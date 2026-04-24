import nodemailer from 'nodemailer'

const NOTIFY_TO = process.env.SIGNUP_NOTIFY_EMAIL || process.env.ORDER_EMAIL || ''

const port = Number(process.env.SMTP_PORT) || 587
const secure = process.env.SMTP_SECURE === 'true'
const transporter =
  NOTIFY_TO && (process.env.SMTP_HOST || process.env.SMTP_USER)
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

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
}

async function userFromAccessToken(supabaseUrl, anonKey, accessToken) {
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  })
  if (!r.ok) return null
  return r.json()
}

async function adminUserById(supabaseUrl, serviceKey, userId) {
  const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })
  if (!r.ok) return null
  const j = await r.json()
  return j.user || j
}

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SPELLBOOK_SUPABASE_URL || '').replace(/\/+$/, '')
  const anonKey = process.env.SPELLBOOK_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.SPELLBOOK_SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !anonKey) {
    return jsonResponse(
      { error: 'Server missing SPELLBOOK_SUPABASE_URL or SPELLBOOK_SUPABASE_ANON_KEY.' },
      503,
      origin
    )
  }

  if (!NOTIFY_TO) {
    return jsonResponse(
      { error: 'ORDER_EMAIL or SIGNUP_NOTIFY_EMAIL must be set.' },
      503,
      origin
    )
  }

  if (!transporter) {
    return jsonResponse(
      {
        error:
          'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM).',
      },
      503,
      origin
    )
  }

  const authHeader = req.headers.get('authorization') || ''
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  const accessToken = m ? m[1].trim() : ''

  let email = ''
  let userId = ''
  let createdAt = ''

  if (accessToken) {
    const u = await userFromAccessToken(supabaseUrl, anonKey, accessToken)
    if (!u || !u.id) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401, origin)
    }
    email = String(u.email || '').trim()
    userId = String(u.id || '').trim()
    createdAt = u.created_at != null ? String(u.created_at) : ''
  } else {
    if (!serviceKey) {
      return jsonResponse(
        {
          error:
            'For sign-ups that require email confirmation (no session yet), the server needs SPELLBOOK_SUPABASE_SERVICE_ROLE_KEY to verify the new user.',
        },
        503,
        origin
      )
    }
    let body
    try {
      body = await req.json()
    } catch (_e) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin)
    }
    const uid = String(body?.user_id || '').trim()
    const em = String(body?.email || '').trim().toLowerCase()
    if (!uid || !em) {
      return jsonResponse(
        { error: 'Send Authorization: Bearer <access_token> or JSON { user_id, email }.' },
        400,
        origin
      )
    }
    const adminUser = await adminUserById(supabaseUrl, serviceKey, uid)
    if (!adminUser) {
      return jsonResponse({ error: 'Could not verify user' }, 400, origin)
    }
    const resolvedEmail = String(adminUser.email || '').trim().toLowerCase()
    if (!resolvedEmail || resolvedEmail !== em) {
      return jsonResponse({ error: 'Email does not match this account' }, 403, origin)
    }
    email = adminUser.email
    userId = uid
    createdAt = adminUser.created_at != null ? String(adminUser.created_at) : ''
  }

  if (!email) {
    return jsonResponse({ error: 'No email for user' }, 400, origin)
  }

  const text = [
    'Someone completed sign-up on The Spellbook.',
    '',
    `Email: ${email}`,
    `User id: ${userId || '(unknown)'}`,
    createdAt ? `Created at: ${createdAt}` : '',
    '',
    '— spellbook-signup-notify (called from the Spellbook after sign-up)',
  ]
    .filter(Boolean)
    .join('\n')

  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'spellbook@yesmagic.local'

  try {
    await transporter.sendMail({
      from: fromAddr,
      to: NOTIFY_TO,
      subject: `[Spellbook] New registration: ${email}`,
      text,
    })
    return jsonResponse({ ok: true }, 200, origin)
  } catch (err) {
    console.error('spellbook-signup-notify', err)
    return jsonResponse({ error: err.message || 'Failed to send email' }, 500, origin)
  }
}

export const config = { path: '/api/spellbook-signup-notify' }
