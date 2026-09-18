#!/usr/bin/env node
/**
 * Mints a checkout session and prints its URL.
 *
 * Lets you exercise the entire payment spine — pricing, tax, shipping, offers,
 * gateways, webhooks, order creation — before the theme app extension exists.
 * It calls exactly the same public endpoint the extension calls.
 *
 *   node scripts/create-test-checkout.mjs <shop-domain> <variant-id> [quantity]
 *
 * Example:
 *   node scripts/create-test-checkout.mjs my-store.myshopify.com 45678901234567 2
 *
 * The variant id is the numeric id from the Shopify admin URL when you open a
 * product variant (.../variants/45678901234567). A bare number or a full
 * gid://shopify/ProductVariant/... both work.
 *
 * Reads NEXT_PUBLIC_PINGGO_API_URL and NEXT_PUBLIC_CHECKOUT_APP_URL from
 * .env.local so it always matches whatever the app is pointed at.
 */

import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function readEnv() {
  const env = {}
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(root, file), "utf8")
      for (const line of raw.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
        if (match && env[match[1]] === undefined) {
          env[match[1]] = match[2].replace(/^["']|["']$/g, "")
        }
      }
    } catch {
      // Missing file is fine — the next one, or process.env, may have it.
    }
  }
  return { ...env, ...process.env }
}

const env = readEnv()
const API = (env.NEXT_PUBLIC_PINGGO_API_URL || "").replace(/\/+$/, "")
const APP = (env.NEXT_PUBLIC_CHECKOUT_APP_URL || env.APP_URL || "").replace(/\/+$/, "")

const [shopDomain, variant, quantityArg] = process.argv.slice(2)

if (!shopDomain || !variant) {
  console.error(
    "Usage: node scripts/create-test-checkout.mjs <shop-domain> <variant-id> [quantity]"
  )
  process.exit(1)
}
if (!API) {
  console.error("NEXT_PUBLIC_PINGGO_API_URL is not set in .env.local")
  process.exit(1)
}

const variantGid = /^\d+$/.test(variant)
  ? `gid://shopify/ProductVariant/${variant}`
  : variant

const body = {
  shopDomain,
  lines: [{ variantGid, quantity: Number(quantityArg) || 1 }],
  attribution: { source: "manual-test" },
}

console.log(`→ POST ${API}/checkout/public/sessions`)
console.log(`  shop: ${shopDomain}`)
console.log(`  item: ${variantGid} ×${body.lines[0].quantity}\n`)

let res
try {
  res = await fetch(`${API}/checkout/public/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
} catch (err) {
  console.error(`✗ Could not reach the API: ${err.message}`)
  console.error("  Is the PingGo server running and reachable at that URL?")
  process.exit(1)
}

const text = await res.text()
let json
try {
  json = JSON.parse(text)
} catch {
  console.error(`✗ ${res.status} — response was not JSON:\n${text.slice(0, 400)}`)
  process.exit(1)
}

if (!res.ok || json.success === false) {
  console.error(`✗ ${res.status} — ${json.message || json.error || "request failed"}`)

  // The three failures that actually happen, and what each one means.
  if (res.status === 404 && /cannot|not found/i.test(text)) {
    console.error(
      "\n  A 404 on this route usually means the checkout module isn't deployed.\n" +
        "  Build and restart the PingGo server, then check:\n" +
        `    curl -o /dev/null -w "%{http_code}" ${API}/checkout/overview   # expect 401, not 404`
    )
  }
  if (/not connected|uninstalled/i.test(json.message ?? "")) {
    console.error(
      "\n  The store isn't linked. Install the app on this dev store first —\n" +
        "  the OAuth callback is what calls /shopify-app/stores/link."
    )
  }
  if (/no longer available|out of stock/i.test(json.message ?? "")) {
    console.error("\n  Check the variant id, and that the product is Active and in stock.")
  }
  process.exit(1)
}

const token = json.data?.token
if (!token) {
  console.error("✗ No token in the response.")
  process.exit(1)
}

console.log("✓ Checkout session created\n")
console.log(`  token:   ${token}`)
console.log(`  expires: ${json.data.expiresAt}\n`)

if (APP && !APP.includes("your-")) {
  console.log(`  Open: ${APP}/checkout/${token}\n`)
} else {
  console.log(`  Open: <your app URL>/checkout/${token}`)
  console.log("  (set NEXT_PUBLIC_CHECKOUT_APP_URL in .env.local to print this in full)\n")
}
