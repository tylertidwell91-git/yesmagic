import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInventory } from '../context/InventoryContext'

const ADMIN_SESSION_KEY = 'yesmagic_admin_session'

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

export default function AdminPage() {
  const { inventory, loading, saveInventory, reload } = useInventory()
  const [products, setProducts] = useState([])
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [newProduct, setNewProduct] = useState({
    price: '',
    quantity: '',
    image: '',
    series: '',
    item: '',
    description: '',
  })

  useEffect(() => {
    setProducts(inventory)
  }, [inventory])

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
    const item = String(newProduct.item ?? '').trim()
    if (!series && !item) return
    const product = {
      id: generateId(),
      price: Math.max(0, Number(newProduct.price) || 0),
      quantity: Math.max(0, Math.floor(Number(newProduct.quantity) || 0)),
      image: String(newProduct.image ?? '').trim() || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop',
      series,
      item,
      description: String(newProduct.description ?? '').trim(),
    }
    setProducts((prev) => [...prev, product])
    setNewProduct({ price: '', quantity: '', image: '', series: '', item: '', description: '' })
  }

  const handleRemove = (id) => {
    if (window.confirm('Remove this product from inventory?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  if (loading) {
    return (
      <AdminGate>
        <div className="yesmagic-main admin-layout">
          <p style={{ color: 'var(--ym-muted)' }}>Loading inventory…</p>
        </div>
      </AdminGate>
    )
  }

  return (
    <AdminGate>
    <div className="yesmagic-main admin-layout">
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
        <Link to="/" className="ym-btn ym-btn-secondary">Back to shop</Link>
      </div>

      {saved && <div className="success-message">Inventory saved.</div>}
      {saveError && <div className="error-message">{saveError}</div>}

      <div className="add-product-form">
        <h3>Add product</h3>
        <div className="form-group">
          <label>Series</label>
          <input
            value={newProduct.series}
            onChange={(e) => setNewProduct((p) => ({ ...p, series: e.target.value }))}
            placeholder="e.g. Classic, Pro"
          />
        </div>
        <div className="form-group">
          <label>Item</label>
          <input
            value={newProduct.item}
            onChange={(e) => setNewProduct((p) => ({ ...p, item: e.target.value }))}
            placeholder="e.g. Deck, Kit, Set"
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            value={newProduct.description}
            onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
            placeholder="Short product description"
          />
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

      <div className="admin-actions">
        <button type="button" className="ym-btn ym-btn-primary" onClick={handleSave}>
          Save inventory
        </button>
      </div>

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Series</th>
              <th>Item</th>
              <th>Description</th>
              <th>Price ($)</th>
              <th>Quantity</th>
              <th>Image URL</th>
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
                  <input
                    value={p.item ?? ''}
                    onChange={(e) => handleChange(p.id, 'item', e.target.value)}
                    placeholder="Item"
                  />
                </td>
                <td>
                  <input
                    value={p.description ?? ''}
                    onChange={(e) => handleChange(p.id, 'description', e.target.value)}
                    placeholder="Description"
                  />
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
    </div>
    </AdminGate>
  )
}
