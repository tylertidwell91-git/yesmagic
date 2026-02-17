import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('yesmagic_cart')
      if (raw) return JSON.parse(raw)
    } catch (_) {}
    return []
  })

  const persist = useCallback((next) => {
    setItems((prev) => {
      const nextItems = typeof next === 'function' ? next(prev) : next
      localStorage.setItem('yesmagic_cart', JSON.stringify(nextItems))
      return nextItems
    })
  }, [])

  const addToCart = useCallback((productId, quantity = 1) => {
    persist((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      const qty = Math.max(1, Number(quantity) || 1)
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { productId, quantity: qty }]
    })
  }, [persist])

  const updateQuantity = useCallback((productId, quantity) => {
    const qty = Math.max(0, Number(quantity) || 0)
    persist((prev) =>
      qty === 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) =>
            i.productId === productId ? { ...i, quantity: qty } : i
          )
    )
  }, [persist])

  const removeFromCart = useCallback((productId) => {
    persist((prev) => prev.filter((i) => i.productId !== productId))
  }, [persist])

  const clearCart = useCallback(() => {
    persist([])
  }, [persist])

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
