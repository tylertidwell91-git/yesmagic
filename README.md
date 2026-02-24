# YESMagic

Standalone shopping site: shop, cart, checkout, and inventory editor. No connection to any other project.

**New to the project?** See **[CONFIGURATION.md](./CONFIGURATION.md)** for a step-by-step guide to setting up payments and order emails.  
**Moving to your own domain?** See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for how to deploy the site and server.

## Run the app

From this folder (`yesmagic`):

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Routes

- **/** – Shop
- **/checkout** – Cart & payment
- **/admin** – Edit inventory (password required; link hidden from nav)

## Admin / Edit inventory

- The “Edit inventory” link is **not** in the main navigation; only you need to know the URL: **/admin**.
- Visiting **/admin** shows a password screen. Set the password in a **.env** file in the `yesmagic` folder:
  ```
  VITE_ADMIN_PASSWORD=your-secret-password
  ```
- After entering the correct password, you can edit inventory for that browser session. Use **Log out** when done (or close the tab).

## Checkout & payments

- From **Cart** (or **/checkout**), customers see the order summary, optional email, and **“Continue to payment”**.
- After that, Stripe’s secure card form is shown. Payment is required before the order is submitted.
- On success, the order is sent to your email (if the order server is configured).

**To accept card payments:**

1. **Stripe keys** (from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)):
   - In **yesmagic/.env**: set `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` (or `pk_live_...`).
   - In **yesmagic/server/.env**: set `STRIPE_SECRET_KEY=sk_test_...` (or `sk_live_...`).
2. In **yesmagic/.env** set `VITE_ORDER_API_URL=http://localhost:3001/api/order` (or your server URL).
3. In **yesmagic/server**: run `npm install` (installs Stripe), then `npm start`.
4. Set **ORDER_EMAIL** (and optionally **SMTP_***) in **server/.env** so new orders are emailed to you.

Without Stripe keys, checkout will show an error asking you to configure payment. The order server must be running with **STRIPE_SECRET_KEY** set so the "Continue to payment" step can create a secure payment session.

## Arkansas sales tax

When the shipping address is in **Arkansas**, checkout looks up the combined state + local sales tax rate from the [Arkansas DFA city/county tax table](https://www.dfa.arkansas.gov/office/taxes/excise-tax-administration/sales-use-tax/) and adds it to the order total.

- **Data:** Tax rates are stored in **`src/data/arTaxTable.json`**, which is built from the official Excel file (e.g. `cityCountyTaxTable_Jan_Mar_2026.xls`).
- **When you get a new DFA file** (new quarter), run:
  ```bash
  npm run build-ar-tax
  ```
  Or with an explicit path:
  ```bash
  node scripts/build-ar-tax-table.cjs /path/to/cityCountyTaxTable_Jan_Mar_2026.xls
  ```
  That updates **`src/data/arTaxTable.json`**. Commit the updated file so the site uses the new rates.
