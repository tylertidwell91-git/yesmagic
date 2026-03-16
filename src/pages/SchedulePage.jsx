import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_URL = '/api/whatnot-shows'
const WHATNOT_PROFILE_URL = 'https://www.whatnot.com/user/yes_magic?referringSource=autocomplete'

export default function SchedulePage() {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(API_URL)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setShows(data)
        } else {
          setShows([])
        }
      })
      .catch(() => {
        setError('Unable to load upcoming shows right now.')
        setShows([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="yesmagic-main schedule-page">
      <h2 className="schedule-title">Upcoming Whatnot Live Shows</h2>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1.5rem' }}>
        This schedule is pulled directly from our Whatnot profile. Click any show to view full details and time on Whatnot.
      </p>

      {loading && (
        <p style={{ color: 'var(--ym-muted)' }}>Loading upcoming shows…</p>
      )}

      {!loading && error && (
        <p className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {!loading && !error && shows.length === 0 && (
        <p style={{ color: 'var(--ym-muted)' }}>
          No upcoming shows are currently listed on Whatnot. Check back soon, or{' '}
          <a
            href={WHATNOT_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--ym-accent)' }}
          >
            visit our Whatnot profile
          </a>
          .
        </p>
      )}

      {!loading && !error && shows.length > 0 && (
        <ul className="schedule-list">
          {shows.map((show) => (
            <li key={show.id} className="schedule-list-item">
              <a
                href={show.url}
                target="_blank"
                rel="noopener noreferrer"
                className="schedule-list-link"
              >
                <span className="schedule-show-title">
                  {show.title || 'Upcoming show'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <a
          href={WHATNOT_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ym-btn ym-btn-primary"
        >
          View on Whatnot
        </a>
        <Link to="/" className="ym-btn ym-btn-secondary">
          Back to shop
        </Link>
      </div>
    </div>
  )
}
