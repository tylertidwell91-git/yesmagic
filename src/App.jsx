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
        <div className="yesmagic-header-top">
          <Link to="/" className="yesmagic-logo">
            <img
              src={yesmagicLogo}
              alt="YESMagic logo"
              className="yesmagic-logo-image"
            />
            <span>YESMagic</span>
          </Link>
          <Link to="/checkout" className="cart-link" aria-label="View cart and checkout">
            <span className="cart-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </div>
        <nav className="yesmagic-nav">
          <Link to="/">Shop</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/whatnot">WhatNot</Link>
          <Link to="/contact">Contact</Link>
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
