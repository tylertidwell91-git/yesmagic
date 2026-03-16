const WHATNOT_URL = 'https://www.whatnot.com/user/yes_magic?referringSource=autocomplete'

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }
}

// Very lightweight HTML scraping to pull upcoming Whatnot live shows.
// We intentionally keep this generic and resilient: we look for public
// live-show links and their immediate text content.
async function fetchWhatnotShows() {
  const res = await fetch(WHATNOT_URL, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`Whatnot fetch failed with status ${res.status}`)
  }
  const html = await res.text()

  // Find anchors that link to /live/... and grab their text.
  const showRegex = /<a[^>]+href="(https:\/\/www\.whatnot\.com\/live\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  const shows = []
  const seen = new Set()

  let match
  while ((match = showRegex.exec(html)) != null) {
    const href = match[1]
    let inner = match[2] || ''
    // Strip HTML tags and collapse whitespace in the anchor text
    inner = inner.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!inner) continue
    if (seen.has(href)) continue
    seen.add(href)
    shows.push({
      id: href,
      title: inner,
      url: href,
    })
  }

  return shows
}

export default async (req) => {
  const origin = req.headers.get('origin') || ''

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(origin),
    })
  }

  try {
    const shows = await fetchWhatnotShows()
    return new Response(JSON.stringify(shows), {
      status: 200,
      headers: corsHeaders(origin),
    })
  } catch (err) {
    console.error('Whatnot shows fetch error:', err)
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: corsHeaders(origin),
    })
  }
}

export const config = { path: '/api/whatnot-shows' }

