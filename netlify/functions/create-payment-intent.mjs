import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
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

  if (!stripe) {
    return new Response(
      JSON.stringify({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Netlify env.' }),
      { status: 503, headers: corsHeaders(origin) }
    )
  }

  try {
    const body = await req.json()
    const amountCents = Math.round(Number(body?.amount) || 0)
    if (amountCents < 50) {
      return new Response(JSON.stringify({ error: 'Amount must be at least $0.50' }), {
        status: 400,
        headers: corsHeaders(origin),
      })
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      // Only allow non-redirect methods (e.g. cards) so we don't need a return_url
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    })
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Create payment intent error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to create payment intent' }),
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

export const config = { path: '/api/create-payment-intent' }
