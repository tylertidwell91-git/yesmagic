import { getStore } from '@netlify/blobs'
import { hasValidAdminSession } from './_admin-auth.mjs'
import fetchModule from 'node-fetch'

const GRAPHQL_ENDPOINT = 'https://api.whatnot.com/seller-api/graphql'

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

async function getFetch() {
  if (typeof fetch === 'function') return fetch
  const fn = fetchModule?.default || fetchModule
  return fn
}

async function fetchUpcomingWhatnotShows() {
  const apiToken = (process.env.WHATNOT_API_TOKEN || '').trim()
  const sellerUsername = (process.env.WHATNOT_SELLER_USERNAME || 'yes_magic').trim()

  if (!apiToken) {
    throw new Error('WHATNOT_API_TOKEN is not configured.')
  }

  const f = await getFetch()

  // NOTE: This query is based on the public Whatnot Seller API docs and may
  // need tweaks if their schema changes. It is intentionally simple: we ask
  // for upcoming (scheduled) livestreams for a single seller.
  const query = `
    query UpcomingLivestreams($seller: String!, $first: Int!) {
      livestreams(first: $first, sellerUsername: $seller, status: SCHEDULED, sortKey: START_TIME) {
        edges {
          node {
            id
            title
            startTime
            url
          }
        }
      }
    }
  `

  const variables = {
    seller: sellerUsername,
    first: 25,
  }

  const res = await f(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Whatnot GraphQL error: ${res.status} ${text}`)
  }

  const json = await res.json()
  if (json.errors && json.errors.length) {
    throw new Error(`Whatnot GraphQL errors: ${JSON.stringify(json.errors)}`)
  }

  const edges = json.data?.livestreams?.edges || []
  const shows = edges
    .map((edge) => edge?.node)
    .filter(Boolean)
    .map((node) => ({
      id: String(node.id),
      date: (node.startTime || '').slice(0, 10), // YYYY-MM-DD for our admin/schedule UI
      time: node.startTime ? new Date(node.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
      title: node.title || '',
      details: node.url || '',
    }))

  return shows
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

  try {
    const shows = await fetchUpcomingWhatnotShows()

    // Store into the same blob used by /api/shows so the existing
    // schedule and admin UIs can read it.
    const store = getStore('yesmagic-inventory')
    await store.set('shows', JSON.stringify(shows))

    return new Response(JSON.stringify({ ok: true, count: shows.length }), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('sync-whatnot-shows error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Failed to sync Whatnot shows' }), {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/sync-whatnot-shows' }

