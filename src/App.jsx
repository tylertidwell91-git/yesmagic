import React, { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import { InventoryProvider } from './context/InventoryContext'
import ShopPage from './pages/ShopPage'
import CheckoutPage from './pages/CheckoutPage'
import AdminPage from './pages/AdminPage'
import WhatNotPage from './pages/WhatNotPage'
import SchedulePage from './pages/SchedulePage'
import ContactPage from './pages/ContactPage'
import yesmagicLogo from './assets/yesmagic-logo.png'
import './App.css'

function CheckoutSuccessPage() {
  const { clearCart } = useCart()

  // Ensure cart is cleared once the user lands on the success page after payment.
  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="yesmagic-main checkout-layout">
      <div className="success-message">Thank you! Your order has been placed.</div>
      <Link to="/" className="ym-btn ym-btn-primary">Back to shop</Link>
    </div>
  )
}

function Layout() {
  const { cartCount } = useCart()

  return (
    <div className="yesmagic">
      <header className="yesmagic-header">
        <Link to="/" className="yesmagic-logo">
          <img
            src={yesmagicLogo}
            alt="YESMagic logo"
            className="yesmagic-logo-image"
          />
          <span>YESMagic</span>
        </Link>
        <nav className="yesmagic-nav">
          <Link to="/">Shop</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/whatnot">WhatNot</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/checkout" className="cart-link">
            Cart {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </nav>
      </header>
      <Routes>
        <Route index element={<ShopPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="whatnot" element={<WhatNotPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="contact" element={<ContactPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <CartProvider>
      <InventoryProvider>
        <Layout />
      </InventoryProvider>
    </CartProvider>
  )
}
