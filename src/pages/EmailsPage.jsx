import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminGate } from './AdminPage'

const WHATNOT_URL = import.meta.env.VITE_WHATNOT_CHANNEL_URL || ''

export default function EmailsPage() {
  return (
    <AdminGate>
      <EmailsPageInner />
    </AdminGate>
  )
}

function EmailsPageInner() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [sendingLive, setSendingLive] = useState(false)
  const [sendingLiveResult, setSendingLiveResult] = useState('')
  const [sendingCustom, setSendingCustom] = useState(false)
  const [sendingCustomResult, setSendingCustomResult] = useState('')

  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [customButtonLabel, setCustomButtonLabel] = useState('Shop now')
  const [customButtonUrl, setCustomButtonUrl] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch('/.netlify/functions/email-subscribers')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to load subscribers.')
        setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : [])
      })
      .catch((err) => setError(err.message || 'Failed to load subscribers.'))
      .finally(() => setLoading(false))
  }, [])

  const updateSubscriber = (id, field, value) => {
    setSubscribers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    )
  }

  const removeSubscriber = (id) => {
    setSubscribers((prev) => prev.filter((s) => s.id !== id))
  }

  const handleExportXls = () => {
    if (!subscribers.length) return
    const headers = [
      'Name',
      'Email',
      'Street',
      'City',
      'State',
      'ZIP',
      'Full address',
      'Created at',
      'Updated at',
    ]
    const rows = subscribers.map((s) => {
      const street = s.street || ''
      const city = s.city || ''
      const state = s.state || ''
      const postal = s.postalCode || s.zip || ''
      const fullAddress =
        s.shippingAddress ||
        [street, city, state, postal].filter(Boolean).join(', ')
      return [
        s.name || '',
        s.email || '',
        street,
        city,
        state,
        postal,
        fullAddress,
        s.createdAt || '',
        s.updatedAt || '',
      ]
    })

    const escapeCell = (value) => {
      const str = String(value).split('"').join('""')
      const noNewlines = str.split('\n').join(' ').split('\r').join(' ')
      return `"${noNewlines}"`
    }

    const lines = [headers, ...rows]
      .map((row) => row.map(escapeCell).join('\t'))
      .join('\n')

    const blob = new Blob([lines], {
      type: 'application/vnd.ms-excel',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'yesmagic-email-subscribers.xls'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const saveSubscribers = async () => {
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/.netlify/functions/email-subscribers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribers }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save subscribers.')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save subscribers.')
    }
  }

  const handleSendLiveEmail = async () => {
    setSendingLive(true)
    setSendingLiveResult('')
    try {
      const res = await fetch('/.netlify/functions/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'go-live', whatnotUrl: WHATNOT_URL }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to send live notification.')
      }
      setSendingLiveResult(`Sent to ${data.sent || 0} subscribers.`)
    } catch (err) {
      setSendingLiveResult(err.message || 'Failed to send live notification.')
    } finally {
      setSendingLive(false)
    }
  }

  const handleSendCustomEmail = async () => {
    setSendingCustom(true)
    setSendingCustomResult('')
    try {
      const res = await fetch('/.netlify/functions/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          subject: customSubject,
          body: customBody,
          buttonLabel: customButtonLabel,
          buttonUrl: customButtonUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to send custom email.')
      }
      setSendingCustomResult(`Sent to ${data.sent || 0} subscribers.`)
    } catch (err) {
      setSendingCustomResult(err.message || 'Failed to send custom email.')
    } finally {
      setSendingCustom(false)
    }
  }

  return (
    <div className="yesmagic-main admin-layout">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h2 className="admin-title" style={{ marginBottom: 0 }}>
          Email subscribers
        </h2>
        <Link to="/admin" className="ym-btn ym-btn-secondary">
          Go to admin page
        </Link>
      </div>

      {loading && (
        <p style={{ color: 'var(--ym-muted)', marginBottom: '1rem' }}>
          Loading subscribers…
        </p>
      )}
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {saved && (
        <div className="success-message" style={{ marginBottom: '1rem' }}>
          Subscribers saved.
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="admin-emails-section">
            <h3>Subscriber list</h3>
            <p
              style={{
                color: 'var(--ym-muted)',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              This table shows everyone who has entered via the subscription
              form. Only one entry is allowed per shipping address, but you can
              edit names, emails, and shipping details here.
            </p>
            <div className="admin-emails-table-wrapper">
              <table className="admin-emails-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Street</th>
                    <th>City</th>
                    <th>State</th>
                    <th>ZIP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="text"
                          value={s.name || ''}
                          onChange={(e) =>
                            updateSubscriber(s.id, 'name', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={s.email || ''}
                          onChange={(e) =>
                            updateSubscriber(s.id, 'email', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={s.street || ''}
                          onChange={(e) =>
                            updateSubscriber(s.id, 'street', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={s.city || ''}
                          onChange={(e) =>
                            updateSubscriber(s.id, 'city', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={s.state || ''}
                          onChange={(e) =>
                            updateSubscriber(s.id, 'state', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={s.postalCode || s.zip || ''}
                          onChange={(e) =>
                            updateSubscriber(
                              s.id,
                              'postalCode',
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ym-btn ym-btn-sm ym-btn-danger"
                          onClick={() => removeSubscriber(s.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {subscribers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          color: 'var(--ym-muted)',
                          fontSize: '0.85rem',
                          textAlign: 'center',
                        }}
                      >
                        No subscribers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div
              style={{
                marginTop: '0.75rem',
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="ym-btn ym-btn-primary"
                onClick={saveSubscribers}
              >
                Save subscribers
              </button>
              <button
                type="button"
                className="ym-btn ym-btn-secondary"
                onClick={handleExportXls}
                disabled={!subscribers.length}
              >
                Export to XLS
              </button>
            </div>
          </section>

          <section
            className="admin-emails-section"
            style={{ marginTop: '2rem' }}
          >
            <h3>Mass email: we&apos;re live on WhatNot</h3>
            <p
              style={{
                color: 'var(--ym-muted)',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              Sends a branded email to all subscribers letting them know that
              you are live streaming on WhatNot right now, with a button linking
              to your channel.
            </p>
            {WHATNOT_URL ? (
              <p
                style={{
                  color: 'var(--ym-muted)',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                }}
              >
                Current WhatNot URL: <code>{WHATNOT_URL}</code>
              </p>
            ) : (
              <p
                style={{
                  color: '#f97373',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                }}
              >
                Set <code>VITE_WHATNOT_CHANNEL_URL</code> in your Netlify env so
                the email can include a link.
              </p>
            )}
            <button
              type="button"
              className="ym-btn ym-btn-primary"
              onClick={handleSendLiveEmail}
              disabled={sendingLive}
            >
              {sendingLive ? 'Sending…' : 'Send "we are live" email'}
            </button>
            {sendingLiveResult && (
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--ym-muted)',
                }}
              >
                {sendingLiveResult}
              </p>
            )}
          </section>

          <section
            className="admin-emails-section"
            style={{ marginTop: '2rem' }}
          >
            <h3>Mass email: custom announcement</h3>
            <p
              style={{
                color: 'var(--ym-muted)',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              Send a custom message to all subscribers. The email will use the
              YESMagic branding and logo, and can include a call-to-action
              button.
            </p>
            <div className="admin-emails-custom-grid">
              <div className="form-group">
                <label htmlFor="custom-subject">Email subject</label>
                <input
                  id="custom-subject"
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. New YESMagic show this weekend"
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom-body">Message</label>
                <textarea
                  id="custom-body"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Write the body of your email. You can use line breaks for paragraphs."
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom-button-label">Button text (optional)</label>
                <input
                  id="custom-button-label"
                  type="text"
                  value={customButtonLabel}
                  onChange={(e) => setCustomButtonLabel(e.target.value)}
                  placeholder="Shop now"
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom-button-url">Button URL (optional)</label>
                <input
                  id="custom-button-url"
                  type="url"
                  value={customButtonUrl}
                  onChange={(e) => setCustomButtonUrl(e.target.value)}
                  placeholder="https://yesmagicshop.com/..."
                />
              </div>
            </div>
            <button
              type="button"
              className="ym-btn ym-btn-primary"
              onClick={handleSendCustomEmail}
              disabled={sendingCustom}
              style={{ marginTop: '0.75rem' }}
            >
              {sendingCustom ? 'Sending…' : 'Send custom email'}
            </button>
            {sendingCustomResult && (
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--ym-muted)',
                }}
              >
                {sendingCustomResult}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

