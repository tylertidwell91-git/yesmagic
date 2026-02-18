import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  defaultProducts,
  ensureProductFields,
  getInventoryApiUrl,
  STORAGE_KEY,
} from '../data/inventory'

const InventoryContext = createContext(null)

export function InventoryProvider({ children }) {
  const [inventory, setInventory] = useState(defaultProducts)
  const [loading, setLoading] = useState(true)
  const apiUrl = getInventoryApiUrl()

  const load = useCallback(async () => {
    if (!apiUrl) {
      try {
        const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInventory(parsed.map(ensureProductFields))
          }
        }
      } catch (_) {}
      setLoading(false)
      return
    }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(apiUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object' && Array.isArray(data.inventory)) {
          if (data.inventory.length > 0) setInventory(data.inventory.map(ensureProductFields))
        } else if (Array.isArray(data) && data.length > 0) {
          setInventory(data.map(ensureProductFields))
        }
      }
    } catch (_) {
      // Timeout or network error: keep default products so shop still works
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    load()
  }, [load])

  const saveInventory = useCallback(async (products) => {
    const normalized = products.map((p) => ({
      id: p.id,
      price: Math.max(0, Number(p.price) || 0),
      quantity: Math.max(0, Math.floor(Number(p.quantity) || 0)),
      shipping: Math.max(0, Number(p.shipping) || 0),
      image: String(p.image ?? '').trim() || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop',
      series: String(p.series ?? '').trim(),
      item: String(p.item ?? '').trim(),
      description: String(p.description ?? '').trim(),
    }))

    if (!apiUrl) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      setInventory(normalized)
      return { ok: true }
    }

    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: normalized }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to save inventory')
    setInventory(normalized)
    return { ok: true }
  }, [apiUrl])

  const value = { inventory, loading, saveInventory, reload: load }
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider')
  return ctx
}
