import { useState, useMemo } from 'react'
import { useInventory } from '../context/InventoryContext'
import { useCart } from '../context/CartContext'

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '0-25', label: 'Under $25' },
  { value: '25-50', label: '$25 – $50' },
  { value: '50-100', label: '$50 – $100' },
  { value: '100-', label: '$100+' },
]

function matchesPrice(price, priceFilter) {
  if (!priceFilter) return true
  const n = Number(price)
  if (priceFilter === '0-25') return n < 25
  if (priceFilter === '25-50') return n >= 25 && n < 50
  if (priceFilter === '50-100') return n >= 50 && n < 100
  if (priceFilter === '100-') return n >= 100
  return true
}

export default function ShopPage() {
  const { addToCart } = useCart()
  const { inventory, loading } = useInventory()
  const [qtyInputs, setQtyInputs] = useState({})
  const [filterSeries, setFilterSeries] = useState('')
  const [filterItem, setFilterItem] = useState('')
  const [filterPrice, setFilterPrice] = useState('')

  const { seriesOptions, itemOptions, filteredProducts } = useMemo(() => {
    const seriesSet = new Set()
    const itemSet = new Set()
    inventory.forEach((p) => {
      const s = String(p.series ?? '').trim()
      const i = String(p.item ?? '').trim()
      if (s) seriesSet.add(s)
      if (i) itemSet.add(i)
    })
    const seriesOptions = [...seriesSet].sort()
    const itemOptions = [...itemSet].sort()

    const filtered = inventory.filter((p) => {
      const series = String(p.series ?? '').trim()
      const item = String(p.item ?? '').trim()
      if (filterSeries && series !== filterSeries) return false
      if (filterItem && item !== filterItem) return false
      if (!matchesPrice(p.price, filterPrice)) return false
      return true
    })

    return { seriesOptions, itemOptions, filteredProducts: filtered }
  }, [inventory, filterSeries, filterItem, filterPrice])

  const qty = (id) => qtyInputs[id] ?? 1
  const setQty = (id, v) => setQtyInputs((prev) => ({ ...prev, [id]: v }))

  if (loading) {
    return (
      <div className="yesmagic-main">
        <p style={{ color: 'var(--ym-muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="yesmagic-main">
      <h2 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Shop</h2>
      <p className="shop-shipping-note">
        Shipping varies by item — shown on each product and at checkout.
      </p>

      <div className="shop-filters">
        <div className="filter-group">
          <label htmlFor="filter-series">Series</label>
          <select
            id="filter-series"
            value={filterSeries}
            onChange={(e) => setFilterSeries(e.target.value)}
          >
            <option value="">All series</option>
            {seriesOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-item">Item</label>
          <select
            id="filter-item"
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
          >
            <option value="">All items</option>
            {itemOptions.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-price">Price</label>
          <select
            id="filter-price"
            value={filterPrice}
            onChange={(e) => setFilterPrice(e.target.value)}
          >
            {PRICE_OPTIONS.map((opt) => (
              <option key={opt.value || 'any'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="shop-grid">
        {filteredProducts.map((p) => {
          const displayName = [p.series, p.item].filter(Boolean).join(' ') || 'Product'
          return (
          <article key={p.id} className="product-card">
            <img src={p.image} alt={displayName} className="product-card-image" />
            <div className="product-card-body">
              <h3 className="product-card-name">{displayName}</h3>
              <p className="product-card-meta">
                {(p.series || p.item) && (
                  <span className="product-card-tags">{[p.series, p.item].filter(Boolean).join(' · ')}</span>
                )}
                {(p.series || p.item) && ' — '}
                {p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}
              </p>
              {p.description && (
                <p className="product-card-description">{p.description}</p>
              )}
              <p className="product-card-price">${Number(p.price).toFixed(2)}{(Number(p.shipping) || 0) > 0 ? ` + $${Number(p.shipping).toFixed(2)} shipping` : ''}</p>
              <div className="product-card-actions">
                <input
                  type="number"
                  min="1"
                  max={p.quantity}
                  value={qty(p.id)}
                  onChange={(e) => setQty(p.id, e.target.value)}
                />
                <button
                  className="ym-btn ym-btn-primary"
                  disabled={p.quantity < 1}
                  onClick={() => addToCart(p.id, qty(p.id))}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </article>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <p className="empty-cart">No products match your filters. Try changing Series, Item, or Price.</p>
      )}
    </div>
  )
}
