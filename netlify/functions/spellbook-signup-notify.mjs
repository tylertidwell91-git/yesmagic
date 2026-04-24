import nodemailer from 'nodemailer'

const NOTIFY_TO = process.env.SIGNUP_NOTIFY_EMAIL || process.env.ORDER_EMAIL || ''
const WEBHOOK_SECRET = (process.env.SPELLBOOK_SIGNUP_NOTIFY_SECRET || '').trim()

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

function jsonResponse(body, status, extraHeaders) {
  const h = Object.assign(
    {
      'Content-Type': 'application/json',
    },
    extraHeaders || {}
  )
  return new Response(JSON.stringify(body), { status, headers: h })
}

function verifySecret(req) {
  if (!WEBHOOK_SECRET) return false
  const h =
    req.headers.get('x-spellbook-signup-secret') ||
    req.headers.get('X-Spellbook-Signup-Secret') ||
    ''
  if (h && h === WEBHOOK_SECRET) return true
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m && m[1].trim() === WEBHOOK_SECRET) return true
  return false
}

/**
 * Supabase Database Webhook payload (INSERT on auth.users):
 * { type, table, schema, record, old_record }
 */
export default async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!WEBHOOK_SECRET) {
    return jsonResponse(
      {
        error:
          'SPELLBOOK_SIGNUP_NOTIFY_SECRET is not set. Add it in Netlify and configure the Supabase webhook with the same value in a header.',
      },
      503
    )
  }

  if (!verifySecret(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!NOTIFY_TO) {
    return jsonResponse(
      { error: 'ORDER_EMAIL or SIGNUP_NOTIFY_EMAIL must be set for signup notifications.' },
      503
    )
  }

  if (!transporter) {
    return jsonResponse(
      {
        error:
          'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) like other site emails.',
      },
      503
    )
  }

  let payload
  try {
    payload = await req.json()
  } catch (_e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const type = String(payload?.type || '')
  const schema = String(payload?.schema || '')
  const table = String(payload?.table || '')
  const record = payload?.record

  if (type !== 'INSERT' || schema !== 'auth' || table !== 'users') {
    return jsonResponse({ ok: true, skipped: true, reason: 'not auth.users INSERT' }, 200)
  }

  if (!record || typeof record !== 'object') {
    return jsonResponse({ ok: true, skipped: true, reason: 'no record' }, 200)
  }

  const email = String(record.email || '').trim()
  const id = String(record.id || '').trim()
  const createdAt = record.created_at != null ? String(record.created_at) : ''

  if (!email) {
    return jsonResponse({ ok: true, skipped: true, reason: 'no email on record' }, 200)
  }

  const text = [
    'A new user registered on The Spellbook (Supabase Auth).',
    '',
    `Email: ${email}`,
    `User id: ${id || '(unknown)'}`,
    createdAt ? `Created at: ${createdAt}` : '',
    '',
    '— Automated message from spellbook-signup-notify',
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
    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    console.error('spellbook-signup-notify', err)
    return jsonResponse({ error: err.message || 'Failed to send email' }, 500)
  }
}

export const config = { path: '/api/spellbook-signup-notify' }
