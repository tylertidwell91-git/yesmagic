import { useEffect, useState } from 'react'

const API_URL = '/.netlify/functions/reply-note'

export default function ReplyPage() {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => (res.ok ? res.json() : { note: '' }))
      .then((data) => setNote(String(data?.note ?? '').trim()))
      .catch(() => setNote(''))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="yesmagic-main reply-page">
        <p style={{ color: 'var(--ym-muted)' }}>Loading message...</p>
      </div>
    )
  }

  return (
    <div className="yesmagic-main reply-page">
      <section className="reply-card">
        <h2 className="reply-title">A Message from YESMagic</h2>
        <p className="reply-copy">{note || 'Thank you for shopping with YESMagic.'}</p>
      </section>
    </div>
  )
}
