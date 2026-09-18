# Connecting to Shopify — install and test

Getting from "the code is written" to "I clicked Buy on a real store and paid".

Run `npm run checkout:doctor` at any point — it checks everything below and
tells you what's still wrong.

---

## The shape of it

Three pieces have to be reachable, and two of them need public HTTPS:

```
Shopify dev store
      │  OAuth + storefront
      ▼
Next.js app  ──── needs a PUBLIC HTTPS URL (tunnel)
  · merchant dashboard        localhost:3000
  · shopper checkout
      │
      ▼
PingGo API   ──── needs a PUBLIC HTTPS URL (gateway webhooks
  · /checkout/*                 + the shopper's browser calls it)
  · /shopify-app/*
      │
      ▼
MongoDB · Redis · Razorpay · PhonePe
```

The theme app extension is a fourth piece, but you don't need it for the first
test — see Stage 3.

---

## Stage 0 — Backend ✅ already deployed

Verified against `server.getcreator.online` on 18 Sep 2026:

- `/api_v1/checkout/overview` → **401** (route exists, auth rejected)
- `/api_v1/shopify-app/triggers` → **401**
- `/api_v1/checkout/public/sessions` with an empty body → **400** with our own
  validation errors

So both modules are live. Nothing to do here unless the doctor says otherwise.

Why it mattered: the OAuth callback calls `/shopify-app/stores/link`. Had that
404'd, the app would have appeared to install fine and then every checkout
screen would have said "Connect your Shopify store".

**Still worth checking on the server** — routes being mounted doesn't prove the
environment is configured. These are only read when they're used, so a missing
one fails later, not at boot:

```bash
CHECKOUT_ENABLED=true
CHECKOUT_CREDENTIAL_ENCRYPTION_KEY=<32+ random chars — NOT the Shopify token key>
CHECKOUT_APP_URL=https://<your tunnel or app domain>
CHECKOUT_API_URL=https://server.getcreator.online
```

`CHECKOUT_CREDENTIAL_ENCRYPTION_KEY` is the one that bites: it's only touched
when you save gateway credentials, so a missing key surfaces as a 500 on the
Gateways page rather than at startup.

If you ever need to redeploy:

```bash
CHECKOUT_ENABLED=true
CHECKOUT_CREDENTIAL_ENCRYPTION_KEY=<32+ random chars — NOT the Shopify token key>
CHECKOUT_APP_URL=https://<your tunnel or app domain>
CHECKOUT_API_URL=https://server.getcreator.online
```

```bash
cd /home/ubuntu/pinggo/pinggo-server
npm run build-force
ls dist/modules/dashboard/checkout      # must exist
pm2 restart /home/ubuntu/pinggo/ecosystem.config.js --update-env
```

Then `npm run checkout:doctor` from your machine — both backend lines must read
**deployed (401)**. A 401 is success here. A 404 means the build didn't land.

---

## Stage 1 — Shopify app + tunnel

### 1a. Partner account and dev store

1. Sign up at <https://partners.shopify.com> (free)
2. **Stores → Add store → Create development store**
3. Add a couple of products with stock, and set a price on each
4. **Settings → Shipping and delivery** — make sure a zone covers the address
   you'll test with. No zone means the checkout correctly says "we don't
   deliver here"
5. **Settings → Taxes** — set up GST if you want to test tax

### 1b. Create the app

In the Partner Dashboard: **Apps → Create app → Create app manually**. Name it
anything.

From the app's **Configuration** page copy the **Client ID** and **Client
secret**.

### 1c. Start a tunnel

Shopify requires public HTTPS. On Windows 11:

```powershell
winget install --id Cloudflare.cloudflared
```

Then, in its own terminal:

```bash
npm run tunnel
```

It prints something like `https://tidy-otter-marsh.trycloudflare.com`. Keep
this terminal open — **the URL changes every time you restart it**, and you have
to update three places when it does (below). If that gets tiresome, set up a
named Cloudflare tunnel on a subdomain of `getcreator.online` for a stable URL.

### 1d. Fill in the config

In `.env.local`:

```bash
SHOPIFY_API_KEY=<Client ID>
SHOPIFY_API_SECRET=<Client secret>
APP_URL=https://<your-tunnel>.trycloudflare.com
NEXT_PUBLIC_CHECKOUT_APP_URL=https://<your-tunnel>.trycloudflare.com
```

In `shopify.app.toml`:

```toml
client_id = "<Client ID — same value as SHOPIFY_API_KEY>"
application_url = "https://<your-tunnel>.trycloudflare.com"

[auth]
redirect_urls = [ "https://<your-tunnel>.trycloudflare.com/api/auth/callback" ]
```

In the **Partner Dashboard → Configuration**:

- **App URL**: `https://<your-tunnel>.trycloudflare.com`
- **Allowed redirection URL**: `https://<your-tunnel>.trycloudflare.com/api/auth/callback`

Also request **Protected customer data** access on that page — reading a
shopper's name, phone and address requires it.

Then:

```bash
npm run checkout:doctor    # everything should be green
npm run dev
```

### 1e. Install on the dev store

Open in a browser:

```
https://<your-tunnel>.trycloudflare.com/api/auth?shop=<your-store>.myshopify.com
```

What happens, in order:

1. No PingGo session → you land on the PingGo sign-in screen
2. Sign in or register — **you need a PingGo account**; the Shopify store gets
   linked to it
3. Redirected to Shopify's permission screen → **Install**
4. Back to `/api/auth/callback` — HMAC verified, token exchanged, store linked
5. You land on `/dashboard`

If you end up back at sign-in, the `pinggo_token` cookie didn't stick — check
the tunnel URL matches `APP_URL` exactly.

---

## Stage 2 — Test the checkout (no extension needed)

### 2a. Connect Razorpay in test mode

1. <https://dashboard.razorpay.com> → switch to **Test Mode**
2. **Account & Settings → API keys → Generate test key**
3. In your app: **Dashboard → Checkout → Gateways**, paste Key ID + Key secret,
   **Connect gateway**
4. Press **Test connection** — it must verify
5. Copy the **webhook URL** shown on that page into Razorpay:
   **Settings → Webhooks → Add**, subscribe to `payment.captured`,
   `payment.failed`, `refund.processed`, `refund.failed`. Set a secret, paste it
   back into the Gateways page

### 2b. Set up the checkout

- **Checkout → Routing**: enable **UPI** and **Cards**, primary = Razorpay
- **Checkout → Customize**: set a colour or two, then **Publish**
  (the storefront switch stays locked until something is published)
- **Checkout → Offers** *(optional)*: add a pay-online discount so you can see
  per-method pricing work

### 2c. Mint a checkout and pay

Get a variant id: open a product in the Shopify admin, click a variant, and
take the number from the URL (`.../variants/45678901234567`).

```bash
npm run checkout:session -- <your-store>.myshopify.com 45678901234567 1
```

It prints a checkout URL. Open it and you should see your branding, your
product, delivery options quoted from your Shopify shipping zones, and tax.

Pay with a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-details/) —
`4111 1111 1111 1111`, any future expiry, any CVV.

### 2d. Check it actually worked

- Success screen shows an order number within ~25s
- **Shopify admin → Orders**: the order exists, **Paid**, tagged
  `pinggo-checkout`, marked as a test order
- **Dashboard → Checkout → Transactions**: the transaction, with Razorpay's
  payment id
- **Dashboard → Checkout → Sessions → (the session)**: the full timeline, from
  creation through webhook to order creation

Then work through `CHECKOUT-LAUNCH.md` Part 2 — especially **B1** (replay the
webhook from the Razorpay dashboard and confirm you still have exactly one
order) and **B7** (break the Shopify token, pay, and watch the order retry).

---

## Stage 3 — The theme app extension

Only once Stage 2 works. This is what replaces the storefront's Buy button.

```bash
npm run extension:deploy
```

The CLI will ask you to log in and confirm the app. It reads `client_id` from
`shopify.app.toml`, so make sure that's right first.

Then, in the dev store: **Online Store → Themes → Customize → App embeds →
enable "PingGo Checkout"**, and Save.

Finally, in your app: **Checkout → Overview → turn on "Checkout on your
storefront"**.

Now add a product to the cart on the storefront and click Checkout — you should
land on your own checkout instead of Shopify's.

If you land on Shopify's checkout instead, that's the extension **failing open**
on purpose. Check, in order: the app embed is enabled; the storefront switch is
on; the browser console for a failed call to `/checkout/public/config/...`.

---

## When the tunnel URL changes

Every `npm run tunnel` restart gives a new URL. Update all four:

1. `.env.local` → `APP_URL` and `NEXT_PUBLIC_CHECKOUT_APP_URL`
2. `shopify.app.toml` → `application_url` and `redirect_urls`
3. Partner Dashboard → App URL and Allowed redirection URL
4. Server `.env` → `CHECKOUT_APP_URL`, then `pm2 restart`

Restart `npm run dev` after, and re-run `npm run checkout:doctor`.

This is the single most annoying part of local Shopify development. A named
Cloudflare tunnel on a `getcreator.online` subdomain removes it entirely and is
worth the ten minutes.

---

## Things that will trip you up

| Symptom | Cause |
|---|---|
| Checkout says "Connect your Shopify store" | Backend wasn't deployed when you installed — redeploy, then reinstall the app |
| 404 on any `/checkout/*` call | `checkout` module not in `dist/` |
| Tax and shipping both zero | `write_draft_orders` scope missing — add it and **reinstall**; scope changes aren't retroactive |
| "We don't deliver to this address" | No Shopify shipping zone covers it |
| OAuth loops back to sign-in | Tunnel URL doesn't match `APP_URL` |
| Order created but unpaid | Webhook secret mismatch — recheck the value in Razorpay and in Gateways |
| Payment succeeds, no order | Expected if Shopify rejected it — look at **Checkout → Orders** for the error, fix it, hit Retry |
| Extension does nothing | App embed not enabled, or the storefront switch is off |
