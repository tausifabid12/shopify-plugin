#!/usr/bin/env node
/**
 * Preflight check for the Shopify + checkout setup.
 *
 *   npm run checkout:doctor
 *
 * Checks the handful of things that actually go wrong, in the order they bite:
 * placeholder env values, missing scopes, a backend that was never redeployed,
 * and URLs that disagree with each other. Every failure prints the fix.
 *
 * Read-only — it changes nothing and needs no credentials.
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

let failures = 0
let warnings = 0

const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`)
const bad = (msg, fix) => {
  failures++
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`)
  if (fix) console.log(`      → ${fix}`)
}
const warn = (msg, fix) => {
  warnings++
  console.log(`  \x1b[33m!\x1b[0m ${msg}`)
  if (fix) console.log(`      → ${fix}`)
}
const section = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`)

// ─── Env ──────────────────────────────────────────────────────────────────────

function readEnv(file) {
  const env = {}
  if (!existsSync(resolve(root, file))) return null
  const raw = readFileSync(resolve(root, file), "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "")
  }
  return env
}

/** Everything in .env.example ships as an obvious placeholder. */
const isPlaceholder = (value) =>
  !value ||
  /your[-_]|REPLACE_WITH|example\.com|your-app-domain|your-tunnel/i.test(value)

section("Environment (.env.local)")

const env = readEnv(".env.local")
if (!env) {
  bad(".env.local is missing", "cp .env.example .env.local, then fill it in")
}

const REQUIRED = [
  ["SHOPIFY_API_KEY", "Client ID from the Partner Dashboard"],
  ["SHOPIFY_API_SECRET", "Client secret from the Partner Dashboard"],
  ["SHOPIFY_SCOPES", "Access scopes"],
  ["APP_URL", "Public HTTPS origin of this app (your tunnel URL)"],
  ["NEXT_PUBLIC_PINGGO_API_URL", "PingGo API base, ending in /api_v1"],
  ["NEXT_PUBLIC_CHECKOUT_APP_URL", "Same as APP_URL — where gateways send shoppers back"],
  [
    "SHOPIFY_APP_SESSION_SECRET",
    "Shared secret with pinggo-server, for the embedded session. openssl rand -base64 48",
  ],
]

for (const [key, what] of REQUIRED) {
  const value = env?.[key]
  if (!value) bad(`${key} is not set`, what)
  else if (isPlaceholder(value)) bad(`${key} is still a placeholder`, what)
  else ok(`${key}`)
}

// ─── Scopes ───────────────────────────────────────────────────────────────────

section("Access scopes")

const scopes = (env?.SHOPIFY_SCOPES ?? "").split(",").map((s) => s.trim())
const NEEDED = {
  read_products: "pricing the cart from the real catalogue",
  write_orders: "creating the order after payment",
  write_draft_orders: "quoting tax and shipping (draftOrderCalculate)",
  read_customers: "shopper name, phone and address",
}

for (const [scope, why] of Object.entries(NEEDED)) {
  if (scopes.includes(scope)) ok(`${scope}`)
  else bad(`${scope} is missing — needed for ${why}`, "add it to SHOPIFY_SCOPES and reinstall the app")
}

// ─── URLs agree ───────────────────────────────────────────────────────────────

section("URLs")

const appUrl = (env?.APP_URL ?? "").replace(/\/+$/, "")
const checkoutUrl = (env?.NEXT_PUBLIC_CHECKOUT_APP_URL ?? "").replace(/\/+$/, "")
const apiUrl = (env?.NEXT_PUBLIC_PINGGO_API_URL ?? "").replace(/\/+$/, "")

if (appUrl && !appUrl.startsWith("https://")) {
  bad("APP_URL is not HTTPS", "Shopify rejects plain http for OAuth — use a tunnel")
} else if (appUrl) ok("APP_URL is HTTPS")

if (appUrl && checkoutUrl && appUrl !== checkoutUrl) {
  warn(
    "APP_URL and NEXT_PUBLIC_CHECKOUT_APP_URL differ",
    "they should match unless the checkout is on its own domain"
  )
} else if (appUrl && checkoutUrl) ok("APP_URL and NEXT_PUBLIC_CHECKOUT_APP_URL match")

if (apiUrl && !apiUrl.endsWith("/api_v1")) {
  warn("NEXT_PUBLIC_PINGGO_API_URL doesn't end in /api_v1", "that's the server's mount path")
} else if (apiUrl) ok("PingGo API base looks right")

// ─── shopify.app.toml ─────────────────────────────────────────────────────────

section("shopify.app.toml")

if (!existsSync(resolve(root, "shopify.app.toml"))) {
  bad("shopify.app.toml is missing")
} else {
  const toml = readFileSync(resolve(root, "shopify.app.toml"), "utf8")
  const clientId = /client_id\s*=\s*"([^"]*)"/.exec(toml)?.[1]

  if (!clientId || isPlaceholder(clientId)) {
    bad(
      "client_id is still a placeholder",
      "paste your app's Client ID (same value as SHOPIFY_API_KEY)"
    )
  } else if (env?.SHOPIFY_API_KEY && clientId !== env.SHOPIFY_API_KEY) {
    bad(
      "client_id doesn't match SHOPIFY_API_KEY",
      "they are the same value — the app won't deploy to the right app otherwise"
    )
  } else ok("client_id is set and matches SHOPIFY_API_KEY")

  if (/write_draft_orders/.test(toml)) ok("write_draft_orders is in the toml scopes")
  else bad("write_draft_orders missing from the toml", "tax and shipping quoting will 403")

  // Embedded needs the session-minting path; unembedded doesn't.
  const embedded = /^\s*embedded\s*=\s*true/m.test(toml)
  if (embedded) {
    const secret = env?.SHOPIFY_APP_SESSION_SECRET
    if (!secret || isPlaceholder(secret)) {
      bad(
        "embedded = true but SHOPIFY_APP_SESSION_SECRET isn't set",
        "the admin iframe can't start a session without it"
      )
    } else if (secret.length < 32) {
      bad("SHOPIFY_APP_SESSION_SECRET is shorter than 32 characters")
    } else {
      ok("embedded = true, session secret present")
    }
    warn(
      "Confirm 'Embed app in Shopify admin' is ON in the Partner Dashboard",
      "Shopify reads the dashboard setting, not this file"
    )
  } else {
    ok("embedded = false (app opens in its own tab)")
  }

  const tomlAppUrl = /application_url\s*=\s*"([^"]*)"/.exec(toml)?.[1]?.replace(/\/+$/, "")
  if (tomlAppUrl && appUrl && tomlAppUrl !== appUrl) {
    bad(
      "application_url doesn't match APP_URL",
      "Shopify redirects to application_url; a mismatch breaks OAuth"
    )
  } else if (tomlAppUrl && !isPlaceholder(tomlAppUrl)) ok("application_url matches APP_URL")
}

// ─── Backend ──────────────────────────────────────────────────────────────────

section("PingGo backend")

if (!apiUrl || isPlaceholder(apiUrl)) {
  bad("Can't check — NEXT_PUBLIC_PINGGO_API_URL isn't set")
} else {
  /**
   * 401 means the route exists and rejected us, which is what we want.
   * 404 means the module was never deployed — the single most common cause of
   * "the app installs but nothing works".
   */
  const probe = async (path, label) => {
    try {
      const res = await fetch(`${apiUrl}${path}`, { method: "GET" })
      if (res.status === 401 || res.status === 403) {
        ok(`${label} is deployed (${res.status})`)
      } else if (res.status === 404) {
        bad(
          `${label} returns 404 — not deployed`,
          "build and restart the PingGo server: npm run build-force && pm2 restart"
        )
      } else {
        warn(`${label} returned ${res.status}`, "expected 401")
      }
    } catch (err) {
      bad(`Could not reach ${apiUrl}${path} — ${err.message}`)
    }
  }

  await probe("/checkout/overview", "checkout module")
  await probe("/shopify-app/triggers", "shopify-app module")
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

console.log("")
if (failures === 0 && warnings === 0) {
  console.log("\x1b[32mAll checks passed.\x1b[0m You're ready to install on a dev store.\n")
} else {
  console.log(
    `\x1b[1m${failures} failure${failures === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.\x1b[0m See SHOPIFY-SETUP.md.\n`
  )
}

// `exitCode` rather than `exit()`: forcing exit while fetch's keep-alive agent
// still holds a handle trips a libuv assertion on Windows.
process.exitCode = failures > 0 ? 1 : 0
