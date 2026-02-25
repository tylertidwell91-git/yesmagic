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
      {/* Cart icon symbol (GoDaddy-style), referenced by cart link */}
      <svg xmlns="http://www.w3.org/2000/svg" className="svg-sprite-hidden" aria-hidden="true">
        <symbol id="svg-container-cart" viewBox="0 0 24 24">
          <path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
        </symbol>
      </svg>
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
          <nav className="yesmagic-nav yesmagic-nav-desktop">
            <Link to="/">Shop</Link>
            <Link to="/schedule">Schedule</Link>
            <Link to="/whatnot">WhatNot</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <Link to="/checkout" className="cart-link" aria-label="View cart and checkout">
            <span className="cart-icon-wrapper">
              <span className="cart-icon uxicon-svg-container" aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" role="presentation" fill="none">
                  <use href="#svg-container-cart" fill="currentColor" />
                </svg>
              </span>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </span>
          </Link>
        </div>
        <nav className="yesmagic-nav yesmagic-nav-mobile">
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
