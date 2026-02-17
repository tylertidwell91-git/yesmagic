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

function formatOrderEmail(body) {
  const lines = []
  if (body.subtotal != null) lines.push(`Subtotal: $${body.subtotal}`)
  if (body.shipping != null) lines.push(`Shipping: $${body.shipping}`)
  if (body.tax != null) lines.push(`Tax: $${body.tax}`)
  lines.push(`Total: $${body.total}`, '', 'Items:')
  lines.push(
    ...body.items.map(
      (i) =>
        `  - ${[i.series, i.item].filter(Boolean).join(' ')} × ${i.quantity} @ $${i.price} = $${i.lineTotal}`
    )
  )
  if (body.customerEmail) lines.push('', `Customer email: ${body.customerEmail}`)
  if (body.shippingAddress) {
    const a = body.shippingAddress
    const addrLines = [
      a.line1,
      a.line2,
      [a.city, a.state].filter(Boolean).join(', '),
      [a.zip, a.country].filter(Boolean).join(' '),
    ].filter((x) => x && String(x).trim().length > 0)
    if (addrLines.length) {
      lines.push('', 'Shipping address:', ...addrLines.map((l) => `  ${l}`))
    }
  }
  return lines.join('\n')
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
    if (!body || !Array.isArray(body.items)) {
      return new Response(JSON.stringify({ error: 'Invalid order' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }

    const text = formatOrderEmail(body)
    console.log('Order received:\n' + text)

    if (ORDER_EMAIL && transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'orders@yesmagic.local',
        to: ORDER_EMAIL,
        subject: `YESMagic order – $${body.total}`,
        text,
      })
      console.log('Order email sent to', ORDER_EMAIL)
    } else if (ORDER_EMAIL) {
      console.warn('ORDER_EMAIL is set but SMTP is not configured.')
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Order error:', err)
    return new Response(JSON.stringify({ error: 'Failed to process order' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/order' }
