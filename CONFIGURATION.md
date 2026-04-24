# How to configure YESMagic (step-by-step)

This guide walks you through getting payments and order emails working.

---

## Part 1: Get your Stripe keys (for card payments)

Stripe is the service that securely handles card payments. You need two keys from them.

1. **Sign up or log in** at [https://dashboard.stripe.com](https://dashboard.stripe.com) (free account).

2. **Open the API keys page:**  
   In the Stripe dashboard, click **Developers** in the left sidebar, then **API keys**.

3. **You’ll see two keys:**
   - **Publishable key** — starts with `pk_test_` (or `pk_live_`). This one is safe to use in the browser.  
   - **Secret key** — starts with `sk_test_` (or `sk_live_`). Click **Reveal** to see it. **Never put this in the browser or share it publicly** — only in your server `.env`.

4. **Copy both** (you’ll paste them in the next steps).  
   For testing, use the **test** keys (`pk_test_...` and `sk_test_...`).

---

## Part 2: Configure the website (yesmagic folder)

You’ll edit **one file**: the `.env` file **inside the yesmagic folder** (same folder as `package.json`).

**Path:** `yesmagic/.env`

1. Open `yesmagic/.env` in your editor.

2. Find this line:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=
   ```
   After the `=`, paste your **Publishable key** from Stripe (the one that starts with `pk_test_` or `pk_live_`).  
   Example:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123xyz...
   ```

3. Leave this line as-is (it’s already correct for local use):
   ```env
   VITE_ORDER_API_URL=http://localhost:3001/api/order
   ```

4. Save the file.

5. **Restart the website** if it’s already running: stop it (Ctrl+C), then run `npm run dev` again from the **yesmagic** folder.

---

## Part 3: Configure the order server (yesmagic/server folder)

The “order server” is a small program that creates the payment and sends order emails. It runs in a **second terminal**, in the **yesmagic/server** folder.

### 3a. Add your keys and email to the server

1. Open the file **yesmagic/server/.env** in your editor.

2. **Stripe Secret key**  
   Find:
   ```env
   STRIPE_SECRET_KEY=
   ```
   After the `=`, paste your **Secret key** from Stripe (the one that starts with `sk_test_` or `sk_live_`).  
   Example:
   ```env
   STRIPE_SECRET_KEY=sk_test_51ABC123xyz...
   ```

3. **Email for new orders**  
   Find:
   ```env
   ORDER_EMAIL=
   ```
   After the `=`, type the email address where you want to receive new orders.  
   Example:
   ```env
   ORDER_EMAIL=you@example.com
   ```

4. Save the file.

### 3b. Install and run the server

1. Open a **terminal**.

2. Go to the server folder:
   ```bash
   cd /Users/tyler/arkansas-razorbacks-basketball/yesmagic/server
   ```

3. Install dependencies (only needed once):
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```
   You should see something like: `Order server running at http://localhost:3001`

5. **Leave this terminal open** while you use the site. When you close it, the server stops and payments won’t work until you run `npm start` again.

---

## Part 4: Run the website

In a **different** terminal (not the server one):

1. Go to the yesmagic folder:
   ```bash
   cd /Users/tyler/arkansas-razorbacks-basketball/yesmagic
   ```

2. Start the site:
   ```bash
   npm run dev
   ```

3. Open **http://localhost:5173** in your browser.

You should now be able to add items to the cart, go to checkout, click “Continue to payment”, enter a card, and place an order. The order will be sent to the email you set in **ORDER_EMAIL**.

---

## Quick checklist

- [ ] Stripe account created at dashboard.stripe.com  
- [ ] **yesmagic/.env** — `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` (your publishable key)  
- [ ] **yesmagic/server/.env** — `STRIPE_SECRET_KEY=sk_test_...` (your secret key)  
- [ ] **yesmagic/server/.env** — `ORDER_EMAIL=your@email.com`  
- [ ] In **yesmagic/server**: run `npm install` then `npm start` (and leave it running)  
- [ ] In **yesmagic**: run `npm run dev` and open http://localhost:5173  

---

## Optional: Sending the order email (SMTP)

By default, the server **logs** orders to the terminal. To **email** each order to **ORDER_EMAIL**, you need to add SMTP settings to **yesmagic/server/.env**.

**Example with Gmail:**

1. In your Google account, turn on 2-Step Verification, then create an **App password** for “Mail”.
2. In **yesmagic/server/.env** add:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=your-16-character-app-password
   SMTP_FROM=your@gmail.com
   ```
3. Restart the server (`npm start` in the server folder).

If you don’t set SMTP, orders still work and are printed in the server terminal; they just won’t be emailed.

---

## Troubleshooting: "Failed to fetch" when paying

This usually means the **browser can’t reach the order server**. Do this:

1. **Check the server is running**  
   In a terminal, go to the server folder and start it:
   ```bash
   cd /Users/tyler/arkansas-razorbacks-basketball/yesmagic/server
   npm start
   ```
   You should see: `Order server running at http://localhost:3001`  
   Leave this terminal open while you use the site.

2. **Use two terminals**  
   - Terminal 1: `yesmagic/server` → `npm start` (order server)  
   - Terminal 2: `yesmagic` → `npm run dev` (website)

3. **Check the URL in yesmagic/.env**  
   It should be exactly:
   ```env
   VITE_ORDER_API_URL=http://localhost:3001/api/order
   ```
   No trailing slash, and the port must be **3001** (or whatever port the server prints when it starts).

4. **Restart after changing .env**  
   If you change any `.env` file, restart both the server and the website (`npm start` and `npm run dev`).

---

## The Spellbook — cloud storage (Supabase)

The Spellbook (`public/spellbook/`, e.g. **spellbook.yesmagicshop.com**) saves each signed-in user’s library, decks, and settings in **Supabase**, not in the browser’s localStorage.

### One-time Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of **`scripts/spellbook-supabase-schema.sql`**, and run it.
3. Under **Authentication → Providers**, enable **Email** (and adjust “Confirm email” if you want instant sign-in without a confirmation message during testing).
4. Copy **Project URL** and the **anon public** key from **Project Settings → API**.

### Deploy / local env

In **`yesmagic/.env`** (local) or **`.env.production`** (build) or **Netlify environment variables**, set:

```env
SPELLBOOK_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SPELLBOOK_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

Running **`npm run dev`** or **`npm run build`** runs **`scripts/inject-spellbook-config.cjs`**, which writes **`public/spellbook/config.js`** (gitignored). Netlify should define the same two variables on the site that builds YESMagic.

The anon key is safe in the browser; **Row Level Security** on `spellbook_data` restricts reads and writes to `auth.uid()`.
