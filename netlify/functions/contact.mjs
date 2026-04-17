import nodemailer from 'nodemailer'

const ORDER_EMAIL = process.env.ORDER_EMAIL || 'yes.enterprises0123@gmail.com'
const port = Number(process.env.SMTP_PORT) || 587
const secure = process.env.SMTP_SECURE === 'true'
const transporter =
  ORDER_EMAIL && (process.env.SMTP_HOST || process.env.SMTP_USER)
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
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
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

  try {
    const body = await req.json()
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim()
    const message = String(body?.message || '').trim()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    const lines = [
      'New contact form submission from YESMagic:',
      '',
      `Name: ${name || '(not provided)'}`,
      `Email: ${email || '(not provided)'}`,
      '',
      'Message:',
      message,
    ]
    const text = lines.join('\n')

    console.log('Contact form received:\n' + text)

    if (!ORDER_EMAIL || !transporter) {
      console.warn('Contact form: ORDER_EMAIL or SMTP not configured.')
      return new Response(
        JSON.stringify({
          error: 'Email is not configured on the server. The site owner needs to set ORDER_EMAIL and SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) in Netlify.',
        }),
        { status: 503, headers: corsHeaders(origin) }
      )
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@yesmagic.local',
      to: ORDER_EMAIL,
      subject: 'YESMagic contact form submission',
      text,
    })
    console.log('Contact email sent to', ORDER_EMAIL)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Contact error:', err)
    const message =
      err.code === 'EAUTH'
        ? 'SMTP authentication failed. Check SMTP_USER and SMTP_PASS in Netlify.'
        : err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT'
          ? 'Could not connect to the mail server. Check SMTP_HOST and SMTP_PORT.'
          : err.message || 'Failed to send email.'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/contact' }

