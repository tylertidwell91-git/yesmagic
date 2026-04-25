import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function SubscribePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmedEmail = email.trim()
    const trimmedStreet = street.trim()
    const trimmedCity = city.trim()
    const trimmedState = state.trim()
    const trimmedPostal = postalCode.trim()

    if (!trimmedEmail) {
      setError('Email is required.')
      return
    }
    if (!trimmedStreet || !trimmedState || !trimmedPostal) {
      setError('Street, state, and ZIP/postal code are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/.netlify/functions/email-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          street: trimmedStreet,
          city: trimmedCity,
          state: trimmedState,
          postalCode: trimmedPostal,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not save your subscription.')
      }
      setSuccess(true)
      setName('')
      setEmail('')
      setStreet('')
      setCity('')
      setState('')
      setPostalCode('')
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
          <label htmlFor="sub-street">Street address *</label>
          <input
            id="sub-street"
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main St"
            required
          />
        </div>
        <div className="form-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 160px' }}>
            <label htmlFor="sub-city">City</label>
            <input
              id="sub-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
          </div>
          <div style={{ flex: '1 1 80px' }}>
            <label htmlFor="sub-state">State/Region *</label>
            <input
              id="sub-state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="AR"
              required
            />
          </div>
          <div style={{ flex: '1 1 100px' }}>
            <label htmlFor="sub-postal">ZIP / Postal code *</label>
            <input
              id="sub-postal"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="12345"
              required
            />
          </div>
        </div>

        <p style={{ color: 'var(--ym-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          By subscribing, you agree to receive occasional emails from YESMagic about live shows, special events, and
          giveaways. You can unsubscribe at any time.
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

