import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInventory } from '../context/InventoryContext'

const ADMIN_SESSION_KEY = 'yesmagic_admin_session'

const ITEM_OPTIONS = [
  'Play Booster Pack',
  'Collector Booster Pack',
  'Collector Box',
  'Commander Deck',
  'Single Card',
]
const DESCRIPTION_OPTIONS = [
  'Brand New',
  'Factory-Sealed',
  'Opened',
  'Minimal Packaging',
  'Pre-Release',
  '10+ Days until shipment',
]

function itemStringToArray(s) {
  if (!s || typeof s !== 'string') return []
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}
function itemArrayToString(arr) {
  return Array.isArray(arr) ? arr.join(', ') : ''
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function AdminGate({ children }) {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(() =>
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin-auth')
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated) {
          sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
          setAuthenticated(true)
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const trimmed = password.trim()
    if (!trimmed) {
      setError('Password is required.')
      return
    }
    fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: trimmed }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || 'Login failed.')
          return
        }
        sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
        setAuthenticated(true)
      })
      .catch(() => setError('Login failed.'))
  }

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    setAuthenticated(false)
    setPassword('')
    fetch('/api/admin-auth', { method: 'DELETE' }).catch(() => {})
    navigate('/')
  }

  if (authenticated) {
    return (
      <>
        {children}
        <div className="yesmagic-main admin-footer-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="ym-btn ym-btn-secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="yesmagic-main checkout-layout">
      <h2 className="checkout-title">Admin</h2>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1.5rem' }}>
        Enter the password to edit inventory.
      </p>
      <form onSubmit={handleSubmit} className="payment-section" style={{ maxWidth: '320px' }}>
        <div className="form-group">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="ym-btn ym-btn-primary">
          Continue
        </button>
      </form>
      <Link to="/" className="ym-btn ym-btn-secondary" style={{ marginTop: '1rem' }}>
        Back to shop
      </Link>
    </div>
  )
}

const SHOWS_API = '/api/shows'
const SHIPPING_RULES_API = '/api/shipping-rules'

export default function AdminPage() {
  const { inventory, loading, saveInventory, reload } = useInventory()
  const [products, setProducts] = useState([])
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [shippingRules, setShippingRules] = useState(null)
  const [shippingRulesSaved, setShippingRulesSaved] = useState(false)
  const [shippingRulesSaveError, setShippingRulesSaveError] = useState('')
  const [shows, setShows] = useState([])
  const [showsSaved, setShowsSaved] = useState(false)
  const [showsSaveError, setShowsSaveError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmDescription, setConfirmDescription] = useState('')
  const [confirmEta, setConfirmEta] = useState('')
  const [confirmSending, setConfirmSending] = useState(false)
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [newProduct, setNewProduct] = useState({
    price: '',
    quantity: '',
    image: '',
    series: '',
    item: '',
    description: '',
    shipping: '',
  })

  useEffect(() => {
    setProducts(inventory)
  }, [inventory])

  useEffect(() => {
    fetch(SHOWS_API)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setShows(Array.isArray(data) ? data : []))
      .catch(() => setShows([]))
  }, [])

  useEffect(() => {
    fetch(SHIPPING_RULES_API)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setShippingRules(data.rules ?? null))
      .catch(() => setShippingRules(null))
  }, [])

  const handleChange = (id, field, value) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleSave = async () => {
    setSaveError('')
    try {
      await saveInventory(products)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save inventory')
    }
  }

  const handleAdd = () => {
    const series = String(newProduct.series ?? '').trim()
    const item = itemArrayToString(itemStringToArray(newProduct.item))
    if (!series && !item) return
    const product = {
      id: generateId(),
      price: Math.max(0, Number(newProduct.price) || 0),
      quantity: Math.max(0, Math.floor(Number(newProduct.quantity) || 0)),
      shipping: Math.max(0, Number(newProduct.shipping) || 0),
      image: String(newProduct.image ?? '').trim() || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop',
      series,
      item,
      description: String(newProduct.description ?? '').trim(),
    }
    setProducts((prev) => [...prev, product])
    setNewProduct({ price: '', quantity: '', image: '', series: '', item: '', description: '', shipping: '' })
  }

  const handleRemove = (id) => {
    if (window.confirm('Remove this product from inventory?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const addShow = () => {
    setShows((prev) => [...prev, { id: generateId(), date: '', time: '', title: '', details: '' }])
  }
  const updateShow = (id, field, value) => {
    setShows((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }
  const removeShow = (id) => {
    setShows((prev) => prev.filter((s) => s.id !== id))
  }
  const saveShows = async () => {
    setShowsSaveError('')
    try {
      const res = await fetch(SHOWS_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shows }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule')
      setShowsSaved(true)
      setTimeout(() => setShowsSaved(false), 3000)
    } catch (err) {
      setShowsSaveError(err.message || 'Failed to save schedule')
    }
  }

  const sendOrderConfirmation = async () => {
    setConfirmError('')
    setConfirmSuccess(false)
    const email = confirmEmail.trim()
    if (!email) {
      setConfirmError('Customer email is required.')
      return
    }
    setConfirmSending(true)
    try {
      const res = await fetch('/api/order-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
          orderDescription: confirmDescription,
          estimatedShipDate: confirmEta,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not send confirmation email.')
      }
      setConfirmSuccess(true)
      setConfirmEmail('')
      setConfirmDescription('')
      setConfirmEta('')
      setTimeout(() => setConfirmSuccess(false), 4000)
    } catch (err) {
      setConfirmError(err.message || 'Could not send confirmation email.')
    } finally {
      setConfirmSending(false)
    }
  }

  const updateShippingTier = (itemType, tierIndex, field, value) => {
    setShippingRules((prev) => {
      const next = { ...(prev || {}) }
      const tiers = [...(next[itemType] || [])]
      if (!tiers[tierIndex]) return prev
      tiers[tierIndex] = { ...tiers[tierIndex], [field]: value }
      next[itemType] = tiers
      return next
    })
  }
  const addShippingTier = (itemType) => {
    setShippingRules((prev) => {
      const next = { ...(prev || {}) }
      const tiers = [...(next[itemType] || []), { min: 1, max: null, price: 0, perUnit: false }]
      next[itemType] = tiers
      return next
    })
  }
  const removeShippingTier = (itemType, tierIndex) => {
    setShippingRules((prev) => {
      const next = { ...(prev || {}) }
      const tiers = (next[itemType] || []).filter((_, i) => i !== tierIndex)
      next[itemType] = tiers.length ? tiers : [{ min: 1, max: null, price: 0, perUnit: false }]
      return next
    })
  }
  const saveShippingRules = async () => {
    setShippingRulesSaveError('')
    try {
      const res = await fetch(SHIPPING_RULES_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: shippingRules }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save shipping rules')
      setShippingRulesSaved(true)
      setTimeout(() => setShippingRulesSaved(false), 3000)
    } catch (err) {
      setShippingRulesSaveError(err.message || 'Failed to save shipping rules')
    }
  }

  return (
    <AdminGate>
    <div className="yesmagic-main admin-layout">
      {loading && <p style={{ color: 'var(--ym-muted)', marginBottom: '1rem' }}>Loading inventory…</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h2 className="admin-title" style={{ marginBottom: 0 }}>Inventory</h2>
        <a
          href="https://privateemail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ym-btn ym-btn-secondary"
        >
          Email
        </a>
        <a
          href="https://docs.google.com/spreadsheets/d/1CMzlLF_XkExTverzJdGzAjrCllVhJ_We5g8ouKpOmb0/edit?gid=937067463#gid=937067463"
          target="_blank"
          rel="noopener noreferrer"
          className="ym-btn ym-btn-secondary"
        >
          Master Spreadsheet
        </a>
        <button
          type="button"
          className="ym-btn ym-btn-secondary"
          onClick={() => {
            const data = inventory.length ? inventory : products
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'yesmagic-inventory.json'
            a.click()
            URL.revokeObjectURL(a.href)
          }}
        >
          Export inventory
        </button>
        <button type="button" className="ym-btn ym-btn-secondary" onClick={() => reload()}>
          Refresh from server
        </button>
        <Link to="/" className="ym-btn ym-btn-secondary">Back to shop</Link>
      </div>

      {saved && <div className="success-message">Inventory saved.</div>}
      {saveError && (
        <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 6 }}>
          {saveError}
        </div>
      )}

      <section className="admin-inventory-section">
        <h3 className="admin-section-heading">Add product</h3>
        <div className="add-product-form add-product-form--spaced">
          <div className="form-group">
            <label>Series</label>
          <input
            value={newProduct.series}
            onChange={(e) => setNewProduct((p) => ({ ...p, series: e.target.value }))}
            placeholder="e.g. Classic, Pro"
            size={25}
            style={{ width: '25ch', minWidth: '25ch' }}
          />
        </div>
        <div className="form-group">
          <label>Item</label>
          <div className="checkbox-group">
            {ITEM_OPTIONS.map((opt) => {
              const selected = itemStringToArray(newProduct.item).includes(opt)
              return (
                <label key={opt}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const arr = itemStringToArray(newProduct.item)
                      const next = e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt)
                      setNewProduct((p) => ({ ...p, item: itemArrayToString(next) }))
                    }}
                  />
                  <span>{opt}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <div className="checkbox-group">
            {DESCRIPTION_OPTIONS.map((opt) => {
              const selected = itemStringToArray(newProduct.description).includes(opt)
              return (
                <label key={opt}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const arr = itemStringToArray(newProduct.description)
                      const next = e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt)
                      setNewProduct((p) => ({ ...p, description: itemArrayToString(next) }))
                    }}
                  />
                  <span>{opt}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="form-group">
          <label>Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={newProduct.price}
            onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div className="form-group">
          <label>Shipping ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={newProduct.shipping}
            onChange={(e) => setNewProduct((p) => ({ ...p, shipping: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            min="0"
            value={newProduct.quantity}
            onChange={(e) => setNewProduct((p) => ({ ...p, quantity: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div className="form-group">
          <label>Image URL</label>
          <input
            value={newProduct.image}
            onChange={(e) => setNewProduct((p) => ({ ...p, image: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <button type="button" className="ym-btn ym-btn-primary" onClick={handleAdd}>
          Add product
        </button>
        </div>
      </section>

      <div className="admin-inventory-actions">
        <button type="button" className="ym-btn ym-btn-primary" onClick={handleSave}>
          Save inventory
        </button>
      </div>

      <h3 className="inventory-section-title">Products</h3>
      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th className="col-series">Series</th>
              <th className="col-item">Item</th>
              <th className="col-description">Description</th>
              <th className="col-price">Price ($)</th>
              <th className="col-shipping">Shipping ($)</th>
              <th className="col-qty">Quantity</th>
              <th className="col-image">Image URL</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    value={p.series ?? ''}
                    onChange={(e) => handleChange(p.id, 'series', e.target.value)}
                    placeholder="Series"
                  />
                </td>
                <td>
                  <div className="checkbox-group-inline">
                    {ITEM_OPTIONS.map((opt) => {
                      const selected = itemStringToArray(p.item).includes(opt)
                      return (
                        <label key={opt}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const arr = itemStringToArray(p.item)
                              const next = e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt)
                              handleChange(p.id, 'item', itemArrayToString(next))
                            }}
                          /> {opt}
                        </label>
                      )
                    })}
                  </div>
                </td>
                <td>
                  <div className="checkbox-group-inline">
                    {DESCRIPTION_OPTIONS.map((opt) => {
                      const selected = itemStringToArray(p.description).includes(opt)
                      return (
                        <label key={opt}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const arr = itemStringToArray(p.description)
                              const next = e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt)
                              handleChange(p.id, 'description', itemArrayToString(next))
                            }}
                          /> {opt}
                        </label>
                      )
                    })}
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={p.price}
                    onChange={(e) => handleChange(p.id, 'price', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={p.shipping ?? ''}
                    onChange={(e) => handleChange(p.id, 'shipping', e.target.value)}
                    placeholder="0"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="col-qty"
                    value={p.quantity}
                    onChange={(e) => handleChange(p.id, 'quantity', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={p.image ?? ''}
                    onChange={(e) => handleChange(p.id, 'image', e.target.value)}
                    placeholder="https://..."
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="ym-btn ym-btn-sm ym-btn-danger"
                    onClick={() => handleRemove(p.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="admin-inventory-section" style={{ marginTop: '2rem' }}>
        <h3 className="admin-section-heading">Shipping rules</h3>
        <p style={{ color: 'var(--ym-muted)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          Configure shipping by item type and quantity. Each tier applies based on the total quantity of that item
          type in the cart.
        </p>
        {shippingRulesSaveError && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>{shippingRulesSaveError}</div>
        )}
        {shippingRulesSaved && (
          <div className="success-message" style={{ marginBottom: '1rem' }}>Shipping rules saved.</div>
        )}
        {shippingRules == null ? (
          <p style={{ color: 'var(--ym-muted)' }}>Loading shipping rules…</p>
        ) : (
          <>
            {Object.entries(shippingRules).map(([itemType, tiers]) => (
              <div key={itemType} className="shipping-rules-block" style={{ marginBottom: '1.5rem' }}>
                <h4
                  style={{
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--ym-font-heading)',
                    color: 'var(--ym-accent)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  {itemType}
                </h4>
                <table className="inventory-table shipping-rules-table">
                  <thead>
                    <tr>
                      <th>Min qty</th>
                      <th>Max qty (blank = ∞)</th>
                      <th>Price ($)</th>
                      <th>Per unit</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(tiers) ? tiers : []).map((tier, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={tier.min ?? ''}
                            onChange={(e) =>
                              updateShippingTier(
                                itemType,
                                idx,
                                'min',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            style={{ width: '5ch' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            placeholder="∞"
                            value={tier.max ?? ''}
                            onChange={(e) =>
                              updateShippingTier(
                                itemType,
                                idx,
                                'max',
                                e.target.value === '' ? null : Number(e.target.value)
                              )
                            }
                            style={{ width: '6ch' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tier.price ?? ''}
                            onChange={(e) =>
                              updateShippingTier(
                                itemType,
                                idx,
                                'price',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            style={{ width: '7ch' }}
                          />
                        </td>
                        <td>
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(tier.perUnit)}
                              onChange={(e) =>
                                updateShippingTier(itemType, idx, 'perUnit', e.target.checked)
                              }
                            />
                            {' '}each
                          </label>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ym-btn ym-btn-sm ym-btn-danger"
                            onClick={() => removeShippingTier(itemType, idx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="ym-btn ym-btn-secondary"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => addShippingTier(itemType)}
                >
                  Add tier
                </button>
              </div>
            ))}
            <button type="button" className="ym-btn ym-btn-primary" onClick={saveShippingRules}>
              Save shipping rules
            </button>
          </>
        )}
      </section>

      <section className="admin-shows-section">
        <h3>Live Stream Schedule</h3>
        {showsSaveError && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>{showsSaveError}</div>
        )}
        {showsSaved && (
          <div className="success-message" style={{ marginBottom: '1rem' }}>Schedule saved.</div>
        )}
        <ul className="admin-shows-list">
          {shows.map((s) => (
            <li key={s.id} className="admin-show-row">
              <div className="admin-show-fields">
                <input
                  type="date"
                  className="show-date"
                  value={s.date ?? ''}
                  onChange={(e) => updateShow(s.id, 'date', e.target.value)}
                />
                <input
                  type="text"
                  className="show-time"
                  placeholder="Time"
                  value={s.time ?? ''}
                  onChange={(e) => updateShow(s.id, 'time', e.target.value)}
                />
                <input
                  type="text"
                  className="show-title"
                  placeholder="Title"
                  value={s.title ?? ''}
                  onChange={(e) => updateShow(s.id, 'title', e.target.value)}
                />
                <button
                  type="button"
                  className="ym-btn ym-btn-sm ym-btn-danger"
                  onClick={() => removeShow(s.id)}
                >
                  Remove
                </button>
              </div>
              <div className="form-group admin-show-details-wrap">
                <label>Event details (shown when users hover or click the event on the schedule)</label>
                <textarea
                  className="show-details"
                  placeholder="e.g. What we're opening, special guests, giveaways…"
                  value={s.details ?? ''}
                  onChange={(e) => updateShow(s.id, 'details', e.target.value)}
                  rows={2}
                  style={{ resize: 'vertical', width: '100%' }}
                />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="ym-btn ym-btn-secondary" onClick={addShow} style={{ marginRight: '0.5rem' }}>
          Add show
        </button>
        <button type="button" className="ym-btn ym-btn-primary" onClick={saveShows}>
          Save schedule
        </button>
      </section>

      <section className="admin-inventory-section" style={{ marginTop: '2rem' }}>
        <h3 className="admin-section-heading">Manual order confirmation email</h3>
        <p style={{ color: 'var(--ym-muted)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          Generate and send a clean order confirmation email from <code>orders@yesmagicshop.com</code>.
        </p>
        {confirmError && (
          <div className="error-message" style={{ marginBottom: '0.75rem' }}>{confirmError}</div>
        )}
        {confirmSuccess && (
          <div className="success-message" style={{ marginBottom: '0.75rem' }}>
            Confirmation email sent.
          </div>
        )}
        <div className="admin-order-confirmation-form">
          <div className="form-group">
            <label htmlFor="confirm-email">Customer email *</label>
            <input
              id="confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-description">Order description</label>
            <textarea
              id="confirm-description"
              value={confirmDescription}
              onChange={(e) => setConfirmDescription(e.target.value)}
              placeholder="Short summary of what they ordered"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-eta">Estimated shipment date</label>
            <input
              id="confirm-eta"
              type="text"
              value={confirmEta}
              onChange={(e) => setConfirmEta(e.target.value)}
              placeholder="e.g. March 15, 2026"
            />
          </div>
          <button
            type="button"
            className="ym-btn ym-btn-primary"
            onClick={sendOrderConfirmation}
            disabled={confirmSending}
          >
            {confirmSending ? 'Sending…' : 'Send confirmation email'}
          </button>
        </div>
      </section>
    </div>
    </AdminGate>
  )
}
