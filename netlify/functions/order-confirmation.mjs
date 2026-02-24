import nodemailer from 'nodemailer'

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

function buildConfirmationEmail({ description, eta }) {
  const lines = []
  lines.push('Hi there,')
  lines.push('')
  lines.push('Thank you for shopping with YESMagic!')
  lines.push('')
  if (description) {
    lines.push('Order details:')
    lines.push(`  ${description}`)
    lines.push('')
  }
  if (eta) {
    lines.push(`Estimated shipment date: ${eta}`)
    lines.push('')
  }
  lines.push('If you have any questions, just reply to this email.')
  lines.push('')
  lines.push('Best wishes,')
  lines.push('YESMagic')
  return lines.join('\n')
}

function buildConfirmationHtml({ description, eta }) {
  const logoUrl =
    process.env.ORDER_LOGO_URL ||
    'https://yesmagicshop.com/assets/yesmagic-email-logo.png'

  const descriptionBlock = description
    ? `<tr>
        <td style="padding: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #e8e6e3;">
          <strong style="color: #c9a227; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px;">Order details</strong><br/>
          <span>${description.replace(/\n/g, '<br/>')}</span>
        </td>
      </tr>`
    : ''

  const etaBlock = eta
    ? `<tr>
        <td style="padding: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #e8e6e3;">
          <strong style="color: #c9a227; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px;">Estimated shipment</strong><br/>
          <span>${eta}</span>
        </td>
      </tr>`
    : ''

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>YESMagic order confirmation</title>
  </head>
  <body style="margin:0; padding:0; background:#0f0e17; font-family: -apple-system, BlinkMacSystemFont, 'DM Sans', system-ui, sans-serif;">
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
                <p style="margin:0 0 12px 0;">Hi there,</p>
                <p style="margin:0 0 16px 0;">
                  Thank you for shopping with <strong style="color:#c9a227;">YESMagic</strong>! This email confirms that we’ve received your order and are getting it ready.
                </p>
              </td>
            </tr>
            ${descriptionBlock}
            ${etaBlock}
            <tr>
              <td style="padding:0 24px 20px 24px; font-size:15px; line-height:1.5; color:#e8e6e3;">
                If you have any questions, just reply to this email.
              </td>
            </tr>
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
    const customerEmail = String(body?.customerEmail || '').trim()
    const description = String(body?.orderDescription || '').trim()
    const eta = String(body?.estimatedShipDate || '').trim()

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'Customer email is required.' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    if (!ORDER_EMAIL || !transporter) {
      console.warn('Order confirmation: ORDER_EMAIL or SMTP not configured.')
      return new Response(
        JSON.stringify({
          error: 'Email is not configured on the server. The site owner needs to set ORDER_EMAIL and SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) in Netlify.',
        }),
        { status: 503, headers: corsHeaders(origin) },
      )
    }

    const text = buildConfirmationEmail({ description, eta })
    const html = buildConfirmationHtml({ description, eta })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'orders@yesmagicshop.com',
      to: customerEmail,
      subject: 'Your YESMagic order confirmation',
      text,
      html,
    })
    console.log('Order confirmation email sent to', customerEmail)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Order confirmation error:', err)
    return new Response(JSON.stringify({ error: 'Failed to send order confirmation.' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/order-confirmation' }

