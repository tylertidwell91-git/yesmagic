const STORAGE_KEY = 'yesmagic_inventory'

export const defaultProducts = [
  { id: '1', price: 29.99, quantity: 50, shipping: 0, image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop', series: 'Dominaria', item: 'Booster Box', description: '36 booster packs from the Dominaria United set.' },
  { id: '2', price: 49.99, quantity: 30, shipping: 0, image: 'https://images.unsplash.com/photo-1580421598329-f84c6dbb0f33?w=400&h=400&fit=crop', series: 'Innistrad', item: 'Bundle', description: 'Set bundle with boosters, lands, and storage box.' },
  { id: '3', price: 79.99, quantity: 20, shipping: 0, image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&h=400&fit=crop', series: 'Zendikar', item: 'Draft Kit', description: 'Draft kit with boosters and accessories for limited play.' }
]

export function ensureProductFields(p) {
  const shipping = p.shipping != null ? Math.max(0, Number(p.shipping)) : 0
  return {
    ...p,
    series: p.series != null ? String(p.series).trim() : '',
    item: p.item != null ? String(p.item).trim() : '',
    description: p.description != null ? String(p.description).trim() : '',
    shipping: Number.isNaN(shipping) ? 0 : shipping,
  }
}

/** Use relative path so API is always same-origin (avoids CORS/redirect when www vs non-www). */
export function getInventoryApiUrl() {
  const orderUrl = import.meta.env.VITE_ORDER_API_URL || ''
  if (!orderUrl) return ''
  return '/api/inventory'
}

/** Sync getter for non-React code (e.g. pull-inventory script). In the app, prefer useInventory(). */
export function getInventory() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(ensureProductFields)
    }
  } catch (_) {}
  return defaultProducts
}

export function getProductById(inventory, id) {
  return (inventory || getInventory()).find((p) => p.id === id)
}

export { STORAGE_KEY }
