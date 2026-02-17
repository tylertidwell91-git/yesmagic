import { useState } from 'react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!message.trim()) {
      setError('Please enter a message.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not send your message.')
      }
      setSuccess(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setError(err.message || 'Could not send your message.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="yesmagic-main checkout-layout">
      <h2 className="checkout-title">Contact us</h2>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1.5rem' }}>
        Questions, comments, or concerns? Send us a note below and we&apos;ll get back to you at
        the email address you provide.
      </p>
      <form onSubmit={handleSubmit} className="payment-section" style={{ maxWidth: '480px' }}>
        <div className="form-group">
          <label htmlFor="contact-name">Name (optional)</label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact-email">Email (optional, for replies)</label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact-message">Message *</label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            rows={5}
            style={{ resize: 'vertical' }}
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">Thanks! Your message has been sent.</p>}
        <button type="submit" className="ym-btn ym-btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  )
}

