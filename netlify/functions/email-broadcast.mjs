import nodemailer from 'nodemailer'
import { getStore } from '@netlify/blobs'
import { hasValidAdminSession } from './_admin-auth.mjs'

const STORE_NAME = 'yesmagic-inventory'
const KEY = 'email-subscribers'

const ORDER_EMAIL = process.env.ORDER_EMAIL || ''
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

function buildBaseHtml({ title, introHtml, bodyHtml, buttonLabel, buttonUrl }) {
  const logoUrl =
    process.env.ORDER_LOGO_URL ||
    'https://yesmagicshop.com/assets/yesmagic-email-logo.png'

  const buttonBlock =
    buttonLabel && buttonUrl
      ? `<tr>
          <td style="padding: 8px 24px 20px 24px;" align="left">
            <a href="${buttonUrl}" style="display:inline-block; padding:10px 18px; border-radius:999px; background:#c9a227; color:#0f0e17; text-decoration:none; font-weight:600; font-size:14px;">
              ${buttonLabel}
            </a>
          </td>
        </tr>`
      : ''

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:#0f0e17; font-family:-apple-system, BlinkMacSystemFont, 'DM Sans', system-ui, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f0e17; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px; margin:0 auto; background:#1a1722; border-radius:10px; border:1px solid #2d2a36; box-shadow:0 4px 20px rgba(0,0,0,0.4);">
            <tr>
              <td style="padding:20px 24px 12px 24px; border-bottom:1px solid #2d2a36; background:#1a1722;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" style="display:flex; align-items:center;">
                      <img src="${logoUrl}" alt="YESMagic" height="40" style="display:block; border:0; margin:0 8px 0 0;" />
                      <span style="color:#c9a227; font-family:'Cinzel', Georgia, serif; letter-spacing:0.12em; text-transform:uppercase; font-size:11px;">YESMagic</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 8px 24px; font-size:16px; line-height:1.6; color:#e8e6e3;">
                ${introHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 12px 24px; font-size:15px; line-height:1.5; color:#e8e6e3;">
                ${bodyHtml}
              </td>
            </tr>
            ${buttonBlock}
            <tr>
              <td style="padding:0 24px 24px 24px; font-size:15px; line-height:1.5; color:#e8e6e3;">
                <p style="margin:0 0 4px 0;">Best wishes,</p>
                <p style="margin:0;"><strong style="color:#c9a227;">YESMagic</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildGoLiveEmail({ whatnotUrl }) {
  const safeUrl = whatnotUrl || 'https://www.whatnot.com'
  const title = 'YESMagic is live on WhatNot!'
  const introHtml =
    '<p style="margin:0 0 12px 0;">Hi there,</p>' +
    '<p style="margin:0 0 16px 0;">We just went <strong style="color:#c9a227;">live on WhatNot</strong> and we&apos;d love for you to join us!</p>'
  const bodyHtml =
    '<p style="margin:0 0 12px 0;">Come hang out, watch packs get opened, and see what&apos;s in the shop. As a subscriber, you&apos;ll always know when we go live so you don&apos;t miss the good stuff.</p>' +
    '<p style="margin:0;">Click the button below to jump straight into the show.</p>'

  const textLines = [
    'Hi there,',
    '',
    'We just went live on WhatNot and we\'d love for you to join us!',
    '',
    'Come hang out, watch packs get opened, and see what\'s in the shop. As a subscriber, you\'ll always know when we go live so you don\'t miss the good stuff.',
    '',
    `Join us here: ${safeUrl}`,
    '',
    'Best wishes,',
    'YESMagic',
  ]

  return {
    subject: title,
    text: textLines.join('\n'),
    html: buildBaseHtml({
      title,
      introHtml,
      bodyHtml,
      buttonLabel: 'Join the live show',
      buttonUrl: safeUrl,
    }),
  }
}

function buildCustomEmail({ subject, body, buttonLabel, buttonUrl }) {
  const safeSubject = subject && subject.trim() ? subject.trim() : 'A message from YESMagic'
  const safeBody = body && body.trim() ? body.trim() : ''
  const escapedBody = safeBody.replace(/\n/g, '<br/>')

  const introHtml =
    '<p style="margin:0 0 12px 0;">Hi there,</p>' +
    '<p style="margin:0 0 16px 0;">We wanted to share a quick update from <strong style="color:#c9a227;">YESMagic</strong>.</p>'
  const bodyHtml = `<p style="margin:0 0 12px 0;">${escapedBody}</p>`

  const textLines = [
    'Hi there,',
    '',
    'We wanted to share a quick update from YESMagic.',
    '',
    safeBody,
    '',
    buttonUrl ? `More details: ${buttonUrl}` : '',
    '',
    'Best wishes,',
    'YESMagic',
  ].filter(Boolean)

  return {
    subject: safeSubject,
    text: textLines.join('\n'),
    html: buildBaseHtml({
      title: safeSubject,
      introHtml,
      bodyHtml,
      buttonLabel: buttonLabel && buttonLabel.trim() ? buttonLabel.trim() : null,
      buttonUrl: buttonUrl && buttonUrl.trim() ? buttonUrl.trim() : null,
    }),
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

  if (!hasValidAdminSession(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders(origin),
    })
  }

  if (!ORDER_EMAIL || !transporter) {
    console.warn('Email broadcast: ORDER_EMAIL or SMTP not configured.')
    return new Response(
      JSON.stringify({
        error:
          'Email is not configured on the server. The site owner needs to set ORDER_EMAIL and SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) in Netlify.',
      }),
      { status: 503, headers: corsHeaders(origin) },
    )
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

  const type = String(body?.type || '').trim()
  if (type !== 'go-live' && type !== 'custom') {
    return new Response(JSON.stringify({ error: 'Invalid type. Must be "go-live" or "custom".' }), {
      status: 400,
      headers: corsHeaders(origin),
    })
  }

  const store = getStore(STORE_NAME)
  let list
  try {
    const raw = await store.get(KEY, { consistency: 'strong' })
    const data = raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
    list = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Email broadcast: failed to read subscribers', err)
    return new Response(JSON.stringify({ error: 'Failed to load subscribers.' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }

  const recipients = list
    .map((s) => String(s.email || '').trim())
    .filter((e, idx, arr) => e && arr.indexOf(e) === idx)

  if (!recipients.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  }

  let template
  if (type === 'go-live') {
    template = buildGoLiveEmail({ whatnotUrl: String(body?.whatnotUrl || '').trim() })
  } else {
    template = buildCustomEmail({
      subject: body?.subject,
      body: body?.body,
      buttonLabel: body?.buttonLabel,
      buttonUrl: body?.buttonUrl,
    })
  }

  let sent = 0
  let failed = 0

  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'orders@yesmagicshop.com',
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })
      sent += 1
    } catch (err) {
      failed += 1
      console.error('Email broadcast send error to', email, err)
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    status: 200,
    headers: corsHeaders(origin),
  })
}

export const config = { path: '/api/email-broadcast' }

