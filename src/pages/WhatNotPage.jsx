import { Link } from 'react-router-dom'

const WHATNOT_URL = import.meta.env.VITE_WHATNOT_CHANNEL_URL || ''

export default function WhatNotPage() {
  return (
    <div className="yesmagic-main checkout-layout">
      <h2 className="checkout-title">WhatNot Channel</h2>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1.5rem' }}>
        Catch our live streams and shop with us on WhatNot.
      </p>
      {WHATNOT_URL ? (
        <a
          href={WHATNOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ym-btn ym-btn-primary"
          style={{ display: 'inline-block' }}
        >
          Go to our WhatNot channel →
        </a>
      ) : (
        <p style={{ color: 'var(--ym-muted)' }}>
          Link will be added soon. Set <code>VITE_WHATNOT_CHANNEL_URL</code> in Netlify env to add your channel URL.
        </p>
      )}
      <Link to="/" className="ym-btn ym-btn-secondary" style={{ marginTop: '1rem', marginLeft: '0.5rem' }}>
        Back to shop
      </Link>
    </div>
  )
}
