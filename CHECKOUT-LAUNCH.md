# Checkout & Payments — launch checklist

Everything in this document is work that has **not** been done and cannot be
done from the codebase alone: configuration, deployment, credentials, and
verification against real systems.

The code is written, typechecks, lints and builds. **None of it has been run
against a live Shopify store or a real gateway.** Treat every section below as
unverified until you have ticked it.

---

## Part 1 — What to do (in order)

### 1. Deploy the backend

The `shopify-app` module has **never been deployed** — that was the original
404. The `checkout` module is new. Both ship together.

- [ ] `cd /home/ubuntu/pinggo/pinggo-server && npm run build-force`
- [ ] Confirm `dist/modules/dashboard/checkout/` and
      `dist/modules/dashboard/shopify-app/` now exist
- [ ] Confirm `dist/routes/index.js` contains `/checkout` and `/shopify-app`
- [ ] `pm2 restart /home/ubuntu/pinggo/ecosystem.config.js --update-env`
- [ ] Smoke: `curl -s -o /dev/null -w "%{http_code}" https://<api>/api_v1/checkout/overview`
      → expect **401** (route exists, auth rejected). A **404** means the build
      or mount didn't land.

There is one known pre-existing TypeScript error in
`shopify-app.controller.ts` — a zod-v3 inference artefact of
`strictNullChecks: false` in the deploy config. `noEmitOnError: false` means it
still emits correct JS. It is not a blocker, but it is worth fixing so the
build log is clean.

### 2. Server environment variables

Add to the server `.env` (documented in `pinggo-server/.env.example`):

- [ ] `CHECKOUT_CREDENTIAL_ENCRYPTION_KEY` — **≥32 chars, and must NOT reuse**
      `SHOPIFY_APP_TOKEN_ENCRYPTION_KEY`. A payment secret and a Shopify token
      have different blast radii and should rotate independently.
- [ ] `CHECKOUT_APP_URL` — public origin of the Next.js app (gateways redirect
      shoppers back here)
- [ ] `CHECKOUT_API_URL` — public origin of the API (builds the webhook URLs)
- [ ] `CHECKOUT_ENABLED=true`
- [ ] `CHECKOUT_SET_ORDER_SOURCE` — leave `false` unless you have registered a
      Shopify channel handle; an unrecognised `sourceName` fails the whole
      `orderCreate` mutation.

### 3. Shopify app configuration

- [ ] Put your real `client_id` in `shopify-plugin-2/shopify.app.toml`
- [ ] Set `application_url` and the redirect URL to your deployed app domain
- [ ] **Scopes must include `write_draft_orders`** — `draftOrderCalculate`
      quotes tax and shipping and is gated behind it. Without this scope the
      checkout cannot compute GST or delivery charges at all.
- [ ] Full scope string:
      `read_orders,write_orders,write_draft_orders,read_customers,read_fulfillments,read_products,write_products`
- [ ] **Merchants who installed before this change must re-authorise** — scope
      changes are not retroactive. Existing installs will get 403s from the
      quote call until they reinstall.
- [ ] Request Shopify **protected customer data** access for the app (reading
      shopper name/phone/email/address requires it)

### 4. Deploy the frontend + theme extension

- [ ] Set `NEXT_PUBLIC_PINGGO_API_URL` and `NEXT_PUBLIC_CHECKOUT_APP_URL` in
      `.env.local`
- [ ] Deploy the Next.js app
- [ ] `npm exec -- shopify app deploy` to publish the theme app extension
- [ ] In the dev store's theme editor: **App embeds → enable "PingGo Checkout"**
- [ ] If your API is on a different origin from the storefront, confirm the
      extension's `api_base` / `checkout_base` settings point at the right hosts

### 5. Merchant setup (in the app UI)

- [ ] Dashboard → Checkout → **Gateways**: connect Razorpay in **test** mode
      (key id + key secret)
- [ ] Add the webhook URL shown on that page to the Razorpay dashboard, and
      paste the webhook secret back in
- [ ] Optionally connect PhonePe (client id, client secret, client version,
      webhook username/password)
- [ ] Press **Test connection** on each — it must say verified
- [ ] Dashboard → Checkout → **Routing**: enable UPI and Cards, set a primary
      gateway for each
- [ ] Dashboard → Checkout → **Customize**: set colours/logo, then **Publish**
      (the storefront switch stays locked until something is published)
- [ ] Dashboard → Checkout → **Offers**: create a pay-online discount (this is
      the lever that shifts orders off COD). Optionally a coupon, a COD fee, or
      a free gift
- [ ] **If you want phone verification (§7):** Customize → *Returning
      customers* → enable recognition, then enable WhatsApp OTP and enter the
      name of an **approved WhatsApp authentication template**. Publishing is
      refused without one, because verification would otherwise fail while a
      shopper waits for a code. The store must also have a connected WhatsApp
      number in PingGo — OTPs are sent on the merchant's own sender
- [ ] Dashboard → Checkout → **Overview**: turn on *Checkout on your storefront*
- [ ] In Shopify admin, confirm the store has **shipping zones** covering your
      test address, and **tax settings** configured — the checkout reads both
      from Shopify and will show "we don't deliver here" if no zone matches

### 6. Only then, go live

- [ ] Connect **live** gateway credentials (separate tab — test and live are
      stored separately by design)
- [ ] Dashboard → Overview → **Go live** (requires an explicit confirmation)
- [ ] Do one real low-value order end to end and refund it

---

## Part 2 — What to test

Ordered roughly by how expensive the failure is if it's broken.

### A. The critical path

| # | Test | Expected |
|---|---|---|
| A1 | Add to cart, click Checkout on the storefront | Lands on `/checkout/<token>`, not Shopify's checkout |
| A2 | Enter phone + address | Delivery options appear; tax appears in the summary |
| A3 | Pick UPI, pay with Razorpay test credentials | Modal opens **over** our page, doesn't navigate away |
| A4 | Complete the payment | Success screen, then order number appears within ~25s |
| A5 | Check Shopify admin | Order exists, **financial status = Paid**, tagged `pinggo-checkout`, marked as a test order |
| A6 | Compare amounts | Shopify order total === amount charged at the gateway, **to the paise** |

### B. Money safety — the tests that matter most

| # | Test | Expected |
|---|---|---|
| B1 | Pay, then replay the gateway webhook (Razorpay dashboard → Resend) | **Exactly one** order in Shopify, one transaction row |
| B2 | Pay, then hit the verify endpoint again with the same params | No second order, no second transaction |
| B3 | Double-click the pay button | One gateway order (same `idempotencyKey` returns the same attempt) |
| B4 | Pay, close the tab before the success screen | Reconciliation job settles it within ~5 min; order still created |
| B5 | Pay with UPI, dismiss the modal *after* approving in the UPI app | Server verifies with the gateway and marks it paid — dismissal is **not** treated as failure |
| B6 | Tamper with the amount in the browser request | Rejected — prices come from Shopify, not the request |
| B7 | Stop the Shopify API (or use a bad token), then pay | Money captured, order queued, retries visible in Orders tab, **loud** log after 8 attempts |
| B8 | Refund a transaction twice concurrently | Second is refused; `amountRefunded` never exceeds `amount` |
| B9 | Partial refund, then refund the remainder | Transaction goes `partially_refunded` → `refunded` |

### C. Tax & shipping (new, entirely unverified)

| # | Test | Expected |
|---|---|---|
| C1 | Enter an address inside a shipping zone | Rates listed, cheapest preselected |
| C2 | Enter an address outside every zone | "We don't deliver to this address", **pay button disabled** |
| C3 | Switch from standard to express delivery | Total *and tax* both update (shipping is taxable in India) |
| C4 | Store with tax-inclusive pricing (MRP) | Summary says "Includes ₹X GST"; tax is **not** added on top; created order has `taxesIncluded: true` |
| C5 | Store with tax-exclusive pricing | Tax is a separate line and is added to the total |
| C6 | Change the address after a quote, then pay | Re-quoted before charging; stale quotes are refused |
| C7 | Compare against Shopify's native checkout for the same cart | Same tax, same shipping |

### D. Routing & fallback

| # | Test | Expected |
|---|---|---|
| D1 | Disable the primary gateway mid-session, then pay | Falls back to the backup gateway |
| D2 | Enter deliberately wrong credentials, then pay | Does **not** fall back (bad credentials aren't retryable); merchant sees the real error |
| D3 | Disable all gateways for a method | Method doesn't appear at checkout |
| D4 | Set the backup = primary | Rejected at save time |

### E. Offers (§24, new)

| # | Test | Expected |
|---|---|---|
| E1 | Create a pay-online discount, view checkout | UPI/Card show a lower total than COD, with a "Save ₹X" badge |
| E2 | Switch from UPI to COD | Discount disappears, total rises, summary updates |
| E3 | Apply a valid coupon | Discount applied, shown in summary |
| E4 | Apply a coupon below its minimum order value | Specific message, not "invalid code" |
| E5 | Coupon with `usageLimit: 1`, two shoppers race | Exactly one redemption counted |
| E6 | Pay with a coupon, then replay the webhook | `usageCount` increments **once** |
| E7 | Two exclusive (non-stackable) offers both qualify | Shopper gets the **larger** one |
| E8 | COD fee configured | Fee added on COD only |
| E9 | Free-gift offer above a threshold | Gift appears as a ₹0 line; Shopify order includes it at ₹0 and **decrements its stock** |
| E10 | Remove items so the cart drops below the gift threshold | Gift line disappears; it never counts toward the threshold that granted it |
| E11 | Gift product deleted or out of stock | Checkout still works — the gift is silently dropped, not an error |
| E12 | Cart below an offer's minimum | "Add ₹500 more for free shipping" nudge shows above the checkout |
| E13 | Merchant banners configured | Render above the checkout in the right tone |

### E′. Returning customers (§7, new)

| # | Test | Expected |
|---|---|---|
| E′1 | Recognition ON, OTP OFF — return with a known phone | "Welcome back", saved addresses offered; one tap fills the form and re-quotes |
| E′2 | Recognition ON, OTP ON — return with a known phone | Addresses **withheld**; prompted to verify |
| E′3 | Send code | Arrives on WhatsApp from the merchant's own number |
| E′4 | Enter the right code | Verified; addresses appear |
| E′5 | Enter a wrong code 5 times | Code burned, must request a new one |
| E′6 | Press Resend immediately | Refused for 30s |
| E′7 | Wait 5 minutes, then enter the code | Rejected as expired |
| E′8 | Enter an **unknown** number | Nothing shown — identical to the unverified case, so registration isn't disclosed |
| E′9 | Verify on one PM2 worker, continue on another | Works — the code lives in Mongo, not process memory |
| E′10 | Addresses after a *failed* order | Not saved — only successful orders remember an address |
| E′11 | Six successful orders to different addresses | At most 5 saved, newest first |
| E′12 | OTP enabled with no template name | Publish refused with a clear message |

### F. Checkout UX

| # | Test | Expected |
|---|---|---|
| F1 | Every layout (single/two column, compact, mobile-first, minimal) | All render correctly at 390px, 834px, 1280px |
| F2 | Set a field to Hidden / Required in the customiser | Checkout respects it |
| F3 | Customiser preview vs real checkout | Visually identical (same components) |
| F4 | Edit the draft without publishing | Live checkout unchanged |
| F5 | Session expiry (wait 60 min) | "This checkout has expired" |
| F6 | Mobile autofill for address | Fills correctly (autocomplete tokens) |

### G. Fail-open behaviour of the theme extension

| # | Test | Expected |
|---|---|---|
| G1 | Stop the PingGo API, click Checkout | Falls through to **Shopify's native checkout** — never a broken page |
| G2 | Turn the storefront switch off | Buy button behaves natively again |
| G3 | Empty cart, click Checkout | Falls through natively |
| G4 | "Buy it now" with the setting enabled | Opens our checkout with the right variant and quantity |

### H. Dashboard

| # | Test | Expected |
|---|---|---|
| H1 | **Open the Analytics page and look at it** | No label collisions, no overflow, charts readable — *this was never rendered during development* |
| H2 | Analytics in test vs live mode | Figures are separate, never summed |
| H3 | Session detail timeline | Full sequence from creation to order creation |
| H4 | Orders tab with a failed order | Retry button works |
| H5 | Multi-tenancy: two stores | Neither can see the other's sessions, transactions, offers or customers |
| H6 | Customers list and detail | Shoppers deduplicated by phone; totals count orders through **this** checkout, so they can differ from Shopify's own customer figures |

### I. Security

| # | Test | Expected |
|---|---|---|
| I1 | Send a webhook with a bad signature | **401**, event logged with `signatureValid: false`, nothing processed |
| I2 | Guess another shopper's session token | Unguessable (24 random bytes); wrong token → 404 |
| I3 | Hammer session creation | Rate limited (429) after 20/min |
| I4 | Inspect the checkout page's network traffic | No `key_secret`, no `client_secret`, no PingGo JWT |
| I5 | Read a credential back from the API | Secrets never returned — only masked public keys |
| I6 | Check the audit log | Gateway connects, live-mode switches, refunds all recorded |

---

## Part 3 — Known gaps and risks

### Compliance (business decision, not a bug)

A Shopify staff moderator has stated on the dev forum that replacing Shopify
Checkout and registering the resulting transactions through the API **without
written authorisation may conflict with the Shopify API License and Terms of
Use**. GoKwik, Shiprocket, Razorpay Magic and Shopflo all operate this model in
India, presumably under agreement. You accepted this risk when choosing the
bypass architecture. Worth getting in writing with Shopify before scaling.

### Not built

- **Abandoned-cart recovery messaging (§15)** — tracking is complete; sending
  WhatsApp/SMS/email is not. Your spec explicitly deferred this ("keep recovery
  separate from the initial payment implementation"), and it belongs with the
  existing automation engine rather than here.
- **Multi-currency** — INR only. `checkout-money.util.ts` is built to extend, but
  no other currency has been wired or tested.
- **Gift product picker** — free-gift offers take a Shopify variant id typed in
  by hand. A product search picker would be better, but needs a Shopify product
  search endpoint that doesn't exist yet in this module.

Everything else in §1–§35 is implemented.

### Risks worth watching

- **`draftOrderCalculate` costs one Admin API call per address change.** Under
  heavy traffic this may hit Shopify's rate limits. The client retries with
  backoff, but watch it.
- **`app.use(cors())` is fully open** on the API and now fronts payment
  endpoints. That predates this work, but it is worth a deliberate decision.
- **PhonePe's webhook has no event id**, so deduplication uses a body hash. Two
  genuinely distinct events never hash alike (state or timestamp differs), but it
  is weaker than Razorpay's explicit id.
- **The analytics charts have never been rendered.** See H1.
- **OTP depends on a WhatsApp template the merchant must get approved.** Meta
  rejects business-initiated messages without one, and approval takes time. A
  store that enables verification before its template is approved will leave
  shoppers waiting for a code that never arrives — hence the publish-time guard,
  but test E′3 is the one that proves it end to end.
- **Free gifts consume real stock.** A gift line decrements inventory like any
  other. A popular gift can go out of stock silently — the offer then stops
  applying rather than failing loudly.
