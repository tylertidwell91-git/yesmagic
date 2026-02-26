import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function SubscribePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmedEmail = email.trim()
    const trimmedAddress = shippingAddress.trim()

    if (!trimmedEmail) {
      setError('Email is required.')
      return
    }
    if (!trimmedAddress) {
      setError('Shipping address is required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/email-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          shippingAddress: trimmedAddress,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not save your subscription.')
      }
      setSuccess(true)
      setName('')
      setEmail('')
      setShippingAddress('')
    } catch (err) {
      setError(err.message || 'Could not save your subscription.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="yesmagic-main checkout-layout">
      <h2 className="checkout-title">Subscribe &amp; enter to win</h2>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1rem' }}>
        Join our mailing list to get notified when we go live on WhatNot and to be entered into our monthly
        drawing for a free pack.
      </p>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Only <strong>one entry is allowed per shipping address</strong>. Each month, we&apos;ll live-stream a drawing
        on the last Saturday of the month and randomly choose a subscriber to receive a free pack.
      </p>

      <form onSubmit={handleSubmit} className="payment-section" style={{ maxWidth: '520px' }}>
        <div className="form-group">
          <label htmlFor="sub-name">Name</label>
          <input
            id="sub-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="sub-email">Email address *</label>
          <input
            id="sub-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="sub-address">Shipping address *</label>
          <textarea
            id="sub-address"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Street, city, state, ZIP, country"
            rows={3}
            style={{ resize: 'vertical' }}
            required
          />
        </div>

        <p style={{ color: 'var(--ym-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          By subscribing, you agree to receive occasional emails from YESMagic about live shows, special events, and
          giveaways. You can unsubscribe at any time using the link in our emails.
        </p>

        {error && <p className="error-message">{error}</p>}
        {success && (
          <p className="success-message">
            Thanks for subscribing! You&apos;re entered into the next drawing.
          </p>
        )}
        <button type="submit" className="ym-btn ym-btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Subscribe'}
        </button>
      </form>

      <Link to="/" className="ym-btn ym-btn-secondary" style={{ marginTop: '1.5rem' }}>
        Back to shop
      </Link>
    </div>
  )
}

