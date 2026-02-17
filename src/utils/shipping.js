/**
 * Get the first item type from a product's item field (comma-separated).
 * Used to assign each cart line to one shipping category.
 */
export function getFirstItemType(product) {
  const item = (product?.item ?? '') && String(product.item).trim()
  if (!item) return ''
  const first = item.split(',')[0]?.trim() ?? ''
  return first
}

/**
 * Compute shipping in dollars from shipping rules and cart lines.
 * rules: { [itemType]: [ { min, max, price, perUnit } ], ... }
 * cartWithProducts: array of { item, cartQuantity, ... }
 */
export function computeShippingFromRules(rules, cartWithProducts) {
  if (!rules || typeof rules !== 'object' || !Array.isArray(cartWithProducts)) return 0

  // Aggregate quantity by (first) item type
  const qtyByType = {}
  for (const p of cartWithProducts) {
    const type = getFirstItemType(p)
    if (!type) continue
    const qty = Math.max(0, Math.floor(Number(p.cartQuantity) || 0))
    if (qty <= 0) continue
    qtyByType[type] = (qtyByType[type] || 0) + qty
  }

  let total = 0
  for (const [itemType, qty] of Object.entries(qtyByType)) {
    const tiers = rules[itemType]
    if (!Array.isArray(tiers) || tiers.length === 0) continue
    // Find tier that matches qty (first where min <= qty <= max or max is null)
    const tier = tiers.find(
      (t) =>
        qty >= (t.min ?? 0) && (t.max == null || t.max === '' || qty <= t.max)
    )
    if (!tier) continue
    const price = Math.max(0, Number(tier.price) ?? 0)
    if (tier.perUnit) {
      total += price * qty
    } else {
      total += price
    }
  }
  return Math.max(0, total)
}
