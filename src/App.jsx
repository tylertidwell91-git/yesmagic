import { Routes, Route, Link } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import { InventoryProvider } from './context/InventoryContext'
import ShopPage from './pages/ShopPage'
import CheckoutPage from './pages/CheckoutPage'
import AdminPage from './pages/AdminPage'
import './App.css'

function Layout() {
  const { cartCount } = useCart()

  return (
    <div className="yesmagic">
      <header className="yesmagic-header">
        <Link to="/" className="yesmagic-logo">YESMagic</Link>
        <nav className="yesmagic-nav">
          <Link to="/">Shop</Link>
          <Link to="/checkout" className="cart-link">
            Cart {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </nav>
      </header>
      <Routes>
        <Route index element={<ShopPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/success" element={
          <div className="yesmagic-main checkout-layout">
            <div className="success-message">Thank you! Your order has been placed.</div>
            <Link to="/" className="ym-btn ym-btn-primary">Back to shop</Link>
          </div>
        } />
        <Route path="admin" element={<AdminPage />} />
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
