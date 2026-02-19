import { useState, useMemo, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useInventory } from '../context/InventoryContext'
import { getProductById } from '../data/inventory'
import { useCart } from '../context/CartContext'
import { computeShippingFromRules } from '../utils/shipping'

const ORDER_API_URL = import.meta.env.VITE_ORDER_API_URL || ''
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

/** Use relative path so API is same-origin (avoids CORS/redirect when www vs non-www). */
function getPaymentIntentUrl() {
  if (!ORDER_API_URL) return ''
  return '/api/create-payment-intent'
}

function buildOrderPayload(
  cartWithProducts,
  subtotalCents,
  shippingCents,
  taxCents,
  totalCents,
  customerEmail,
  shippingAddress
) {
  return {
    items: cartWithProducts.map((p) => ({
      id: p.id,
      series: p.series,
      item: p.item,
      quantity: p.cartQuantity,
      price: p.price,
      lineTotal: (p.price * p.cartQuantity).toFixed(2),
    })),
    subtotal: (subtotalCents / 100).toFixed(2),
    shipping: (shippingCents / 100).toFixed(2),
    tax: (taxCents / 100).toFixed(2),
    total: (totalCents / 100).toFixed(2),
    totalCents,
    customerEmail: customerEmail.trim() || undefined,
    shippingAddress: shippingAddress || undefined,
  }
}

function PaymentForm({ cartWithProducts, totalCents, customerEmail, orderPayload, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    onError(null)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          receipt_email: customerEmail.trim() || undefined,
        },
      })
      if (error) {
        onError(error.message || 'Payment failed')
        setSubmitting(false)
        return
      }
      // Payment succeeded; submit order to our server for email notification
      let emailFailed = false
      if (ORDER_API_URL) {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })
        if (!res.ok) emailFailed = true
      }
      onSuccess({ emailFailed })
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      if (isNetworkError) {
        onError('Could not reach the server. Is the order server still running? (Run "npm start" in the yesmagic/server folder.)')
      } else {
        onError(err.message || 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="payment-section">
      <h3>Card details</h3>
      <p style={{ color: 'var(--ym-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Pay securely with your card. Your payment is processed by Stripe.
      </p>
      <div className="ym-stripe-element" style={{ marginBottom: '1rem' }}>
        <PaymentElement />
      </div>
      <button
        type="submit"
        className="ym-btn ym-btn-primary"
        disabled={!stripe || submitting}
      >
        {submitting ? 'Processing…' : `Pay $${(totalCents / 100).toFixed(2)} & place order`}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const { items, clearCart, removeFromCart } = useCart()
  const { inventory, loading } = useInventory()

  const cartWithProducts = useMemo(() =>
    items
      .map((item) => {
        const product = getProductById(inventory, item.productId)
        return product ? { ...product, cartQuantity: item.quantity } : null
      })
      .filter(Boolean),
    [items, inventory]
  )

  const [orderComplete, setOrderComplete] = useState(false)
  const [emailFailed, setEmailFailed] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [clientSecret, setClientSecret] = useState(null)
  const [error, setError] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [shippingAddress, setShippingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  })
  const [addressError, setAddressError] = useState('')
  const [shippingRules, setShippingRules] = useState(null)

  useEffect(() => {
    fetch('/api/shipping-rules')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setShippingRules(data.rules ?? null))
      .catch(() => setShippingRules(null))
  }, [])

  const isShippingAddressValid = useMemo(() => {
    const a = shippingAddress
    return (
      (a.line1 || '').trim().length > 0 &&
      (a.city || '').trim().length > 0 &&
      (a.state || '').trim().length > 0 &&
      (a.zip || '').trim().length > 0 &&
      (a.country || '').trim().length > 0
    )
  }, [shippingAddress])

  const subtotalCents = useMemo(
    () => Math.round(cartWithProducts.reduce((sum, p) => sum + p.price * p.cartQuantity * 100, 0)),
    [cartWithProducts]
  )
  const shippingCents = useMemo(() => {
    const dollars = computeShippingFromRules(shippingRules || {}, cartWithProducts)
    return Math.round(dollars * 100)
  }, [shippingRules, cartWithProducts])
  // No sales tax is added by the site. All applicable tax is handled outside
  // of this checkout flow. We still keep a Tax line in the UI for clarity.
  const taxCents = 0
  const totalCents = subtotalCents + shippingCents + taxCents

  const orderPayload = useMemo(
    () =>
      buildOrderPayload(
        cartWithProducts,
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        customerEmail,
        shippingAddress
      ),
    [cartWithProducts, subtotalCents, shippingCents, taxCents, totalCents, customerEmail, shippingAddress]
  )

  const paymentIntentUrl = getPaymentIntentUrl()

  const handleContinueToPayment = async () => {
    setError(null)
    setAddressError('')
    if (!isShippingAddressValid) {
      setAddressError('Please fill in all required shipping address fields.')
      return
    }
    // Hard-block Arkansas shipments: we do not ship to AR.
    const country = (shippingAddress.country || '').trim().toUpperCase()
    const state = (shippingAddress.state || '').trim().toUpperCase()
    const isUS =
      country === 'US' ||
      country === 'USA' ||
      country === 'UNITED STATES' ||
      country === 'UNITED STATES OF AMERICA'
    const isArkansas = state === 'AR' || state === 'ARKANSAS'
    if (isUS && isArkansas) {
      setAddressError('We currently do not ship to Arkansas addresses.')
      return
    }
    if (!STRIPE_PK) {
      setError('Payment is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to the .env file.')
      return
    }
    if (!paymentIntentUrl) {
      setError('Order server URL is not set. Add VITE_ORDER_API_URL and run the order server.')
      return
    }
    setLoadingPayment(true)
    try {
      const res = await fetch(paymentIntentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalCents }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`)
      if (!data.clientSecret) throw new Error('Invalid server response')
      setClientSecret(data.clientSecret)
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      if (isNetworkError) {
        setError('Could not reach the order server. Make sure it is running: in the yesmagic/server folder run "npm start" and leave it open.')
      } else {
        setError(err.message || 'Could not load payment form.')
      }
    } finally {
      setLoadingPayment(false)
    }
  }

  const handlePaymentSuccess = ({ emailFailed: ef } = {}) => {
    setOrderComplete(true)
    if (ef) setEmailFailed(true)
    clearCart()
  }

  if (loading) {
    return (
      <div className="yesmagic-main checkout-layout">
        <p style={{ color: 'var(--ym-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (orderComplete) {
    return (
      <div className="yesmagic-main checkout-layout">
        <div className="success-message">
          Thank you! Your order has been placed and payment was successful.
        </div>
        {emailFailed && (
          <p className="error-message" style={{ marginTop: '0.5rem' }}>
            Order notification could not be sent. Check that the order server is running and ORDER_EMAIL is set.
          </p>
        )}
        <Link to="/" className="ym-btn ym-btn-primary" style={{ marginTop: '1rem' }}>
          Back to shop
        </Link>
      </div>
    )
  }

  if (cartWithProducts.length === 0) {
    // When the last item is removed from the cart on the checkout page,
    // show a friendly empty state with navigation rather than a blank view.
    return (
      <div className="yesmagic-main checkout-layout">
        <div className="empty-cart empty-cart-checkout">
          <p>Your cart is empty. There&apos;s nothing to check out right now.</p>
          <Link to="/" className="ym-btn ym-btn-primary">
            Back to shop
          </Link>
        </div>
      </div>
    )
  }

  const options = useMemo(
    () => (clientSecret ? { clientSecret, appearance: { theme: 'night' } } : null),
    [clientSecret]
  )

  return (
    <div className="yesmagic-main checkout-layout">
      <h2 className="checkout-title">Checkout</h2>

      <div className="cart-summary">
        <h3>Order summary</h3>
        {cartWithProducts.map((p) => (
          <div key={p.id} className="cart-line cart-line-item">
            <span>
              {[p.series, p.item].filter(Boolean).join(' ') || 'Product'} × {p.cartQuantity}
            </span>
            <span className="cart-line-right">
              <span>${(p.price * p.cartQuantity).toFixed(2)}</span>
              <button
                type="button"
                className="cart-remove-btn"
                onClick={() => removeFromCart(p.id)}
                title="Remove from cart"
              >
                Remove
              </button>
            </span>
          </div>
        ))}
        <div className="cart-line">
          <span>Subtotal</span>
          <span>${(subtotalCents / 100).toFixed(2)}</span>
        </div>
        <div className="cart-line">
          <span>Shipping</span>
          <span>{shippingCents > 0 ? `$${(shippingCents / 100).toFixed(2)}` : 'Free'}</span>
        </div>
        <div className="cart-line cart-total">
          <span>Total</span>
          <span>${(totalCents / 100).toFixed(2)}</span>
        </div>
      </div>

      {!clientSecret ? (
        <>
          <div className="checkout-address-section">
            <h3>Shipping address</h3>
            <div className="checkout-address-grid">
              <div className="form-group form-group-full">
                <label htmlFor="address-line1">Address line 1 *</label>
                <input
                  id="address-line1"
                  type="text"
                  value={shippingAddress.line1}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, line1: e.target.value }))}
                  placeholder="Street address"
                  autoComplete="address-line1"
                />
              </div>
              <div className="form-group form-group-full">
                <label htmlFor="address-line2">Address line 2 (optional)</label>
                <input
                  id="address-line2"
                  type="text"
                  value={shippingAddress.line2}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, line2: e.target.value }))}
                  placeholder="Apt, suite, etc."
                  autoComplete="address-line2"
                />
              </div>
              <div className="form-group">
                <label htmlFor="address-city">City *</label>
                <input
                  id="address-city"
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, city: e.target.value }))}
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
              <div className="form-group">
                <label htmlFor="address-state">State / Province *</label>
                <input
                  id="address-state"
                  type="text"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, state: e.target.value }))}
                  placeholder="State"
                  autoComplete="address-level1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="address-zip">ZIP / Postal code *</label>
                <input
                  id="address-zip"
                  type="text"
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, zip: e.target.value }))}
                  placeholder="ZIP"
                  autoComplete="postal-code"
                />
              </div>
              <div className="form-group">
                <label htmlFor="address-country">Country *</label>
                <input
                  id="address-country"
                  type="text"
                  value={shippingAddress.country}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, country: e.target.value }))}
                  placeholder="Country"
                  autoComplete="country-name"
                />
              </div>
            </div>
          </div>
          <div className="payment-section">
            <h3>Payment</h3>
            <div className="form-group">
              <label htmlFor="customer-email">Your email (optional, for receipt)</label>
              <input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {addressError && <p className="error-message">{addressError}</p>}
            {error && <p className="error-message">{error}</p>}
            <button
              type="button"
              className="ym-btn ym-btn-primary"
              disabled={loadingPayment}
              onClick={handleContinueToPayment}
            >
              {loadingPayment ? 'Loading…' : 'Continue to payment'}
            </button>
          </div>
        </>
      ) : options && stripePromise ? (
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm
            cartWithProducts={cartWithProducts}
            totalCents={totalCents}
            customerEmail={customerEmail}
            orderPayload={orderPayload}
            onSuccess={handlePaymentSuccess}
            onError={setError}
          />
        </Elements>
      ) : null}
    </div>
  )
}
