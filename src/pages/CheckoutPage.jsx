import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useInventory } from '../context/InventoryContext'
import { getProductById } from '../data/inventory'
import { useCart } from '../context/CartContext'

const ORDER_API_URL = import.meta.env.VITE_ORDER_API_URL || ''
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

function getPaymentIntentUrl() {
  if (!ORDER_API_URL) return ''
  return ORDER_API_URL.replace(/\/api\/order\/?$/, '') + '/api/create-payment-intent'
}

function buildOrderPayload(cartWithProducts, totalCents, customerEmail) {
  return {
    items: cartWithProducts.map((p) => ({
      id: p.id,
      series: p.series,
      item: p.item,
      quantity: p.cartQuantity,
      price: p.price,
      lineTotal: (p.price * p.cartQuantity).toFixed(2),
    })),
    total: (totalCents / 100).toFixed(2),
    totalCents,
    customerEmail: customerEmail.trim() || undefined,
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
        const res = await fetch(ORDER_API_URL, {
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
  const { items, clearCart } = useCart()
  const inventory = useMemo(() => getInventory(), [])

  const cartWithProducts = useMemo(() =>
    items
      .map((item) => {
        const product = getProductById(inventory, item.productId)
        return product ? { ...product, cartQuantity: item.quantity } : null
      })
      .filter(Boolean),
    [items, inventory]
  )

  const totalCents = useMemo(
    () => Math.round(cartWithProducts.reduce((sum, p) => sum + p.price * p.cartQuantity * 100, 0)),
    [cartWithProducts]
  )

  const [orderComplete, setOrderComplete] = useState(false)
  const [emailFailed, setEmailFailed] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [clientSecret, setClientSecret] = useState(null)
  const [error, setError] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(false)

  const orderPayload = useMemo(
    () => buildOrderPayload(cartWithProducts, totalCents, customerEmail),
    [cartWithProducts, totalCents, customerEmail]
  )

  const paymentIntentUrl = getPaymentIntentUrl()

  const handleContinueToPayment = async () => {
    setError(null)
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
    return (
      <div className="yesmagic-main checkout-layout">
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <Link to="/" className="ym-btn ym-btn-primary">
            Continue shopping
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
          <div key={p.id} className="cart-line">
            <span>
              {[p.series, p.item].filter(Boolean).join(' ') || 'Product'} × {p.cartQuantity}
            </span>
            <span>${(p.price * p.cartQuantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="cart-line cart-total">
          <span>Total</span>
          <span>${(totalCents / 100).toFixed(2)}</span>
        </div>
      </div>

      {!clientSecret ? (
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
