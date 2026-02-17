import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInventory } from '../context/InventoryContext'

const ADMIN_SESSION_KEY = 'yesmagic_admin_session'

const ITEM_OPTIONS = ['Play Booster Pack', 'Collector Booster Pack', 'Collector Box', 'Commander Deck']
const DESCRIPTION_OPTIONS = ['Brand New', 'Factory-Sealed', 'Opened', 'Minimal Packaging']

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

function AdminGate({ children }) {
  const navigate = useNavigate()
  // Normalize: strip whitespace, line endings, and optional surrounding quotes
  const raw = import.meta.env.VITE_ADMIN_PASSWORD || ''
  const expectedPassword = raw.replace(/\r\n?|\n/g, '').trim().replace(/^["']|["']$/g, '')
  const [authenticated, setAuthenticated] = useState(() =>
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!expectedPassword) {
      setError('Admin password is not configured. Add VITE_ADMIN_PASSWORD to your .env file.')
      return
    }
    const trimmed = password.trim()
    if (trimmed === expectedPassword.trim()) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
      setAuthenticated(true)
    } else {
      setError('Incorrect password.')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    setAuthenticated(false)
    setPassword('')
    navigate('/')
  }

  if (authenticated) {
    return (
      <>
        {children}
        <div className="yesmagic-main" style={{ marginTop: '1rem' }}>
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

export default function AdminPage() {
  const { inventory, loading, saveInventory, reload } = useInventory()
  const [products, setProducts] = useState([])
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [shows, setShows] = useState([])
  const [showsSaved, setShowsSaved] = useState(false)
  const [showsSaveError, setShowsSaveError] = useState('')
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
    setShows((prev) => [...prev, { id: generateId(), date: '', time: '', title: '' }])
  }
  const updateShow = (id, field, value) => {
    setShows((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }
  const removeShow = (id) => {
    setShows((prev) => prev.filter((s) => s.id !== id))
  }
  const saveShows = async () => {
    setShowsSaveError('')
    const raw = import.meta.env.VITE_ADMIN_PASSWORD || ''
    const adminPassword = raw.replace(/\r\n?|\n/g, '').trim().replace(/^["']|["']$/g, '')
    try {
      const res = await fetch(SHOWS_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, shows }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule')
      setShowsSaved(true)
      setTimeout(() => setShowsSaved(false), 3000)
    } catch (err) {
      setShowsSaveError(err.message || 'Failed to save schedule')
    }
  }

  return (
    <AdminGate>
    <div className="yesmagic-main admin-layout">
      {loading && <p style={{ color: 'var(--ym-muted)', marginBottom: '1rem' }}>Loading inventory…</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <h2 className="admin-title" style={{ marginBottom: 0 }}>Inventory</h2>
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
                    size={25}
                    style={{ width: '25ch', minWidth: '25ch' }}
                  />
                </td>
                <td>
                  <div className="checkbox-group-inline">
                    {ITEM_OPTIONS.map((opt) => {
                      const selected = itemStringToArray(p.item).includes(opt)
                      return (
                        <label key={opt} style={{ display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
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
                        <label key={opt} style={{ display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
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
            <li key={s.id}>
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
    </div>
    </AdminGate>
  )
}
