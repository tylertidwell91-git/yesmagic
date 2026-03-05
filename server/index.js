import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import Stripe from 'stripe'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const INVENTORY_FILE = join(DATA_DIR, 'inventory.json')

const DEFAULT_INVENTORY = [
  { id: '1', price: 29.99, quantity: 50, image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop', series: 'Dominaria', item: 'Booster Box', description: '36 booster packs from the Dominaria United set.' },
  { id: '2', price: 49.99, quantity: 30, image: 'https://images.unsplash.com/photo-1580421598329-f84c6dbb0f33?w=400&h=400&fit=crop', series: 'Innistrad', item: 'Bundle', description: 'Set bundle with boosters, lands, and storage box.' },
  { id: '3', price: 79.99, quantity: 20, image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&h=400&fit=crop', series: 'Zendikar', item: 'Draft Kit', description: 'Draft kit with boosters and accessories for limited play.' },
]

function readStoredInventory() {
  try {
    if (existsSync(INVENTORY_FILE)) {
      const raw = readFileSync(INVENTORY_FILE, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (_) {}
  return DEFAULT_INVENTORY
}

function writeStoredInventory(products) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(INVENTORY_FILE, JSON.stringify(products, null, 2), 'utf8')
}

const app = express()
// CORS: localhost in dev; in production set ALLOWED_ORIGINS to your domain(s), e.g. https://yesmagicshop.com,https://www.yesmagicshop.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']
app.use(cors({ origin: allowedOrigins, credentials: false }))
app.use(express.json())

const ORDER_EMAIL = process.env.ORDER_EMAIL || ''
const PORT = process.env.PORT || 3001
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null

// SMTP: set these in .env to send real email (e.g. Gmail app password, SendGrid, etc.)
// If not set, orders are logged to console only.
const transporter = ORDER_EMAIL && (process.env.SMTP_HOST || process.env.SMTP_USER)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    })
  : null

function formatOrderEmail(body) {
  const lines = [
    `Total: $${body.total}`,
    '',
    'Items:',
    ...body.items.map((i) => `  - ${[i.series, i.item].filter(Boolean).join(' ')} × ${i.quantity} @ $${i.price} = $${i.lineTotal}`),
  ]
  if (body.customerEmail) lines.push('', `Customer email: ${body.customerEmail}`)
  return lines.join('\n')
}

// Create a PaymentIntent so the frontend can collect payment securely
app.post('/api/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in server/.env' })
  }
  try {
    const { amount } = req.body
    const amountCents = Math.round(Number(amount) || 0)
    if (amountCents < 50) {
      return res.status(400).json({ error: 'Amount must be at least $0.50' })
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      // Only allow non-redirect methods (e.g. cards) so we don't need a return_url
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    })
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Create payment intent error:', err)
    res.status(500).json({ error: err.message || 'Failed to create payment intent' })
  }
})

// Inventory: GET for all visitors, PUT for admin only (same password as frontend admin)
app.get('/api/inventory', (req, res) => {
  try {
    res.json(readStoredInventory())
  } catch (err) {
    console.error('Inventory read error:', err)
    res.status(500).json({ error: 'Failed to load inventory' })
  }
})

app.put('/api/inventory', (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const { adminPassword: sent, products } = req.body || {}
  const sentTrimmed = typeof sent === 'string' ? sent.trim() : ''
  if (!adminPassword || sentTrimmed !== adminPassword.trim()) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Invalid payload: products must be an array' })
  }
  try {
    const normalized = products.map((p) => ({
      id: String(p.id ?? ''),
      price: Math.max(0, Number(p.price) ?? 0),
      quantity: Math.max(0, Math.floor(Number(p.quantity) ?? 0)),
      image: String(p.image ?? '').trim() || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop',
      series: String(p.series ?? '').trim(),
      item: String(p.item ?? '').trim(),
      description: String(p.description ?? '').trim(),
    }))
    writeStoredInventory(normalized)
    res.json({ ok: true })
  } catch (err) {
    console.error('Inventory write error:', err)
    res.status(500).json({ error: 'Failed to save inventory' })
  }
})

app.post('/api/order', async (req, res) => {
  try {
    const body = req.body
    if (!body || !Array.isArray(body.items)) {
      return res.status(400).json({ error: 'Invalid order' })
    }

    const text = formatOrderEmail(body)
    console.log('Order received:\n' + text)

    if (ORDER_EMAIL && transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'orders@yesmagic.local',
        to: ORDER_EMAIL,
        subject: `YESMagic order – $${body.total}`,
        text,
      })
      console.log('Order email sent to', ORDER_EMAIL)
    } else if (ORDER_EMAIL) {
      console.warn('ORDER_EMAIL is set but SMTP is not configured. Set SMTP_* in .env to receive emails.')
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Order error:', err)
    res.status(500).json({ error: 'Failed to process order' })
  }
})

app.listen(PORT, () => {
  console.log(`Order server running at http://localhost:${PORT}`)
  if (!stripe) console.log('Set STRIPE_SECRET_KEY in server/.env to accept card payments.')
  if (!ORDER_EMAIL) console.log('Set ORDER_EMAIL in server/.env to receive order notifications.')
  else if (!transporter) console.log('Set SMTP_HOST, SMTP_USER, SMTP_PASS in server/.env to send emails.')
  if (!process.env.ADMIN_PASSWORD) console.log('Set ADMIN_PASSWORD in server/.env (same as VITE_ADMIN_PASSWORD) to allow admin inventory saves.')
})
