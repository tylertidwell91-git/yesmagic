# Deploying YESMagic to your own domain

You can move YESMagic from localhost to a domain you buy. You can run **everything on Netlify** (no Railway or other backend needed), or deploy the frontend and backend separately.

---

## Option A: All on Netlify (recommended)

The repo includes **Netlify Functions** for the API (payments, orders, inventory). One deploy gives you the site and the backend.

1. **Connect the repo to Netlify**  
   Site settings → Build & deploy → Link repository. Build command: `npm run build`. Publish directory: `dist`. Functions directory: `netlify/functions` (usually auto-detected).

2. **Set environment variables** in Netlify (Site settings → Environment variables). Add:
   - `VITE_ORDER_API_URL` = **your site’s full URL + `/api/order`**, e.g. `https://yesmagicshop.com/api/order` or `https://your-site.netlify.app/api/order` (use the same URL visitors use).
   - `VITE_STRIPE_PUBLISHABLE_KEY` = your Stripe publishable key (`pk_live_...` or `pk_test_...`).
   - `VITE_ADMIN_PASSWORD` = password for the **/admin** page (edit inventory).
   - `STRIPE_SECRET_KEY` = your Stripe secret key (`sk_live_...` or `sk_test_...`).
   - `ORDER_EMAIL` = email address to receive order notifications.
   - `ALLOWED_ORIGINS` = your site URL(s), e.g. `https://yesmagicshop.com,https://www.yesmagicshop.com`.
   - `ADMIN_PASSWORD` = **same value as `VITE_ADMIN_PASSWORD`** (so the admin page can save inventory).
   - Optional (to send order emails): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

3. **Deploy.** Push to your connected branch or trigger a deploy. The site and `/api/order`, `/api/create-payment-intent`, `/api/inventory` will all be served from the same Netlify site. Inventory is stored in **Netlify Blobs** (persists across deploys).

4. **Point your domain** at the Netlify site (Site settings → Domain management), then update `VITE_ORDER_API_URL` and `ALLOWED_ORIGINS` to use that domain if needed.

You do **not** need Railway or the `server/` folder for this setup.

---

## Option B: Frontend + separate backend (e.g. Railway)

If you prefer to run the API on Railway, Render, or another host, use the **server** in `yesmagic/server` and ignore the Netlify Functions. Deploy the site to Netlify (or Vercel) and point `VITE_ORDER_API_URL` at your backend URL.

### Automated commands (from the yesmagic folder)

| Command | What it does |
|--------|----------------|
| **npm run prepare-deploy** | Creates `.env.production` if missing, runs a production build, and prints next steps. Run this first. |
| **npm run deploy:site** | Builds and deploys the **website** to Vercel (requires Vercel CLI and `vercel link` once). |
| **cd server && npm run deploy** | Deploys the **order server** to Railway (requires Railway CLI and `railway link` once). |

**First time:** Run `npm run prepare-deploy`. Edit the generated **.env.production** with your real order server URL and Stripe key, then run `npm run prepare-deploy` again to build. After that, use `deploy:site` and/or the server’s `deploy` when you’re ready to push to Vercel/Railway.

---

## Overview

- **Website (frontend)** — The React app runs in the user’s browser. You build it once and upload the built files to any host that serves static files (Netlify, Vercel, your own server, etc.). Your domain **yesmagicshop.com** (or `www.yesmagicshop.com`) points to this.
- **Order server (backend)** — The small Node server that handles Stripe and email must run on a machine that’s always on and reachable from the internet. You deploy it to a cloud host (Railway, Render, Fly.io, or a VPS) and get a URL like `https://api.yesmagicshop.com` or your host’s URL (e.g. `https://yesmagic-server.onrender.com`).

You’ll do three things: deploy the site, deploy the server, then point **yesmagicshop.com** at your frontend (and optionally a subdomain at the server).

---

## 1. Deploy the website (frontend)

1. **Prepare and build** (from the `yesmagic` folder):
   ```bash
   npm run prepare-deploy
   ```
   The first run creates `.env.production` from the example (or from your `.env`). Edit **yesmagic/.env.production** and set `VITE_ORDER_API_URL` to your real order server URL and `VITE_STRIPE_PUBLISHABLE_KEY` to your live key. Then run `npm run prepare-deploy` again to build.  
   Or build manually: `npm run build` (uses `.env.production` if it exists). This creates a `dist` folder with the static files.

2. **Set production env vars before building**  
   Create or edit `yesmagic/.env` and set:
   - `VITE_ORDER_API_URL` = the **full URL** of your order server, e.g. `https://api.yesmagicshop.com/api/order` or `https://yesmagic-server.onrender.com/api/order`.
   - `VITE_STRIPE_PUBLISHABLE_KEY` = your **live** Stripe publishable key (`pk_live_...`) if you’re accepting real payments.

   Then run `npm run build` again so these values are baked into the build.

3. **Upload the `dist` folder** to your host:
   - **Netlify / Vercel:** Connect your repo and set the build command to `npm run build` and publish directory to `dist`. Set the env vars in the host’s dashboard (VITE_ORDER_API_URL, VITE_STRIPE_PUBLISHABLE_KEY).
   - **Your own server:** Copy the contents of `dist` to your web root (e.g. nginx/Apache) and point your domain at it.

4. **Point your domain** at this host: set **yesmagicshop.com** (and optionally **www.yesmagicshop.com**) to point to Netlify, Vercel, or your server (via DNS A/CNAME as your host instructs).

---

## 2. Deploy the order server (backend)

The server in `yesmagic/server` must run on a host that can receive HTTPS requests.

**Options:**

- **Railway / Render / Fly.io** — Sign up, create a new “Web Service”, connect your repo (or upload the `yesmagic/server` folder). Set the start command to `npm start` and add **environment variables** in the dashboard:
  - `STRIPE_SECRET_KEY` (your **live** key, `sk_live_...`, for real payments)
  - `ORDER_EMAIL`
  - `ALLOWED_ORIGINS` = your site URL(s), e.g. `https://yesmagicshop.com,https://www.yesmagicshop.com`
  - `ADMIN_PASSWORD` = same value as `VITE_ADMIN_PASSWORD` on the frontend (so the admin page can save inventory to the server; inventory is stored in `server/data/inventory.json`)
  - Optional: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc. for email

  **Note:** Inventory is stored in a JSON file on the server. On Railway/Render, the filesystem can be ephemeral (resets on redeploy). For persistent inventory across deploys, use a persistent volume if your host supports it.

- **VPS (DigitalOcean, Linode, etc.)** — Install Node, clone/copy the `yesmagic/server` folder, run `npm install` and `npm start`, and put it behind a process manager (e.g. pm2) and a reverse proxy (nginx) with HTTPS. Set the same env vars in a `.env` file or systemd environment.

After deployment you’ll get a URL like `https://your-app-name.onrender.com` (or `https://api.yesmagicshop.com` if you use a subdomain). Use that **base URL** to form the order and payment URLs:

- Order: `https://your-app-name.onrender.com/api/order`
- Payment intent: `https://your-app-name.onrender.com/api/create-payment-intent`

So in the **frontend** you set:
`VITE_ORDER_API_URL=https://your-app-name.onrender.com/api/order`

---

## 3. CORS: allow your domain

The order server only accepts requests from origins you allow. In production you must allow your real site.

- If you deploy the server to **Railway/Render/Fly.io**, set this env var in their dashboard:
  ```env
  ALLOWED_ORIGINS=https://yesmagicshop.com,https://www.yesmagicshop.com
  ```
  (Use your actual domain and include both with and without `www` if you use both.)

- If you run the server yourself (VPS), add the same to your server’s `.env` or environment.

The server code already reads `ALLOWED_ORIGINS`; no code change is needed.

---

## 4. Stripe for production

- In [Stripe Dashboard](https://dashboard.stripe.com) switch to **Live** mode when you’re ready to take real money.
- Use **live** keys: `pk_live_...` in the frontend (via `VITE_STRIPE_PUBLISHABLE_KEY`) and `sk_live_...` in the server (`STRIPE_SECRET_KEY`).
- In Stripe, you can add your domain under **Settings → Domains** if required for your integration.

---

## 5. Checklist for your domain

**If using Option A (all on Netlify):**

- [ ] Repo connected to Netlify; build command `npm run build`, publish `dist`, functions in `netlify/functions`.
- [ ] Env vars set in Netlify: `VITE_ORDER_API_URL` (your site URL + `/api/order`), `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`, `ORDER_EMAIL`, `ALLOWED_ORIGINS`, `ADMIN_PASSWORD` (same as `VITE_ADMIN_PASSWORD`).
- [ ] Domain pointed at Netlify; `VITE_ORDER_API_URL` and `ALLOWED_ORIGINS` use that domain.

**If using Option B (separate backend):**

- [ ] Domain **yesmagicshop.com** DNS pointed at your frontend host (Netlify, Vercel, or your server).
- [ ] Frontend built with `VITE_ORDER_API_URL` and `VITE_STRIPE_PUBLISHABLE_KEY` set for production.
- [ ] Frontend deployed and reachable at **https://yesmagicshop.com** (and/or https://www.yesmagicshop.com).
- [ ] Order server deployed and reachable (e.g. https://your-app.onrender.com or https://api.yesmagicshop.com).
- [ ] Server env vars set: `STRIPE_SECRET_KEY`, `ORDER_EMAIL`, `ALLOWED_ORIGINS`, `ADMIN_PASSWORD` (same as `VITE_ADMIN_PASSWORD`; and any SMTP vars).
- [ ] Stripe live keys in use if you’re accepting real payments.

Once that’s done, visitors can use **yesmagicshop.com** to shop and pay; the flow is the same as on localhost, just with your URL and live Stripe keys.
