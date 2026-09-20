import "server-only"

import { cookies } from "next/headers"

import { PINGGO_API_BASE } from "@/lib/pinggo-api"
import {
  shopFromSessionToken,
  verifySessionToken,
} from "@/lib/shopify-session-token"

/**
 * Establishing a PingGo session inside the Shopify admin iframe (§embedded).
 *
 * The problem: an embedded app is third-party to admin.shopify.com, so the
 * merchant's normal PingGo cookie is neither stored nor sent there. Shopify's
 * session token proves *which shop* is asking; this turns that into a session.
 *
 *     App Bridge id_token
 *         │  verified here (HS256, our client secret)
 *         ▼
 *     shop domain we can trust
 *         │  POST /shopify-app/session  (+ shared app secret)
 *         ▼
 *     PingGo JWT for the vendor who installed that store
 *         │
 *         ▼
 *     Set-Cookie … SameSite=None; Secure; Partitioned
 *
 * The cookie is **partitioned** (CHIPS): the browser keys it to the pairing of
 * (admin.shopify.com, our origin), so it is usable inside the iframe and is
 * invisible to our own first-party site. That isolation is the point —
 * unpartitioned third-party cookies are being removed by browsers anyway.
 */

const TOKEN_COOKIE = "pinggo_token"
const USER_ID_COOKIE = "pinggo_user_id"
const SHOP_COOKIE = "shopify_shop"

export type EmbeddedSessionResult =
  | { ok: true; shop: string; userId: string }
  | { ok: false; reason: "invalid_token" | "not_linked" | "unavailable"; message: string }

function embeddedCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    path: "/",
    // SameSite=None is mandatory for a cross-site iframe; Partitioned is what
    // keeps that from being a third-party cookie in the old, blocked sense.
    sameSite: "none" as const,
    secure: true,
    partitioned: true,
    maxAge: maxAgeSeconds,
  }
}

/**
 * Verifies a Shopify session token and issues a PingGo session for its shop.
 *
 * Returns a discriminated result rather than throwing: every failure here has
 * a different remedy for the merchant (re-open the app, install it, try later),
 * and the caller renders accordingly.
 */
export async function establishEmbeddedSession(
  idToken: string
): Promise<EmbeddedSessionResult> {
  const apiKey = process.env.SHOPIFY_API_KEY
  const apiSecret = process.env.SHOPIFY_API_SECRET
  const appSecret = process.env.SHOPIFY_APP_SESSION_SECRET

  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      reason: "unavailable",
      message: "The app is not configured (SHOPIFY_API_KEY / SHOPIFY_API_SECRET).",
    }
  }
  if (!appSecret) {
    return {
      ok: false,
      reason: "unavailable",
      message: "The app is not configured (SHOPIFY_APP_SESSION_SECRET).",
    }
  }

  let shop: string
  try {
    shop = shopFromSessionToken(verifySessionToken(idToken, { apiKey, apiSecret }))
  } catch (err) {
    // Expected in normal use: these tokens live about a minute, so a reloaded
    // tab arrives with a stale one. The caller asks App Bridge for a fresh one.
    return {
      ok: false,
      reason: "invalid_token",
      message: err instanceof Error ? err.message : "Invalid session token.",
    }
  }

  let res: Response
  try {
    res = await fetch(`${PINGGO_API_BASE}/shopify-app/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The app secret is the whole security boundary on that endpoint. It
        // is server-side only and must never be sent to the browser.
        "x-shopify-app-secret": appSecret,
      },
      body: JSON.stringify({ shopDomain: shop }),
      cache: "no-store",
    })
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      message: "Could not reach PingGo. Please try again in a moment.",
    }
  }

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean
    message?: string
    data?: { token?: string; userId?: string; expiresAt?: string }
  }

  if (!res.ok || !json.data?.token || !json.data.userId) {
    // 404/409 mean the store was never linked, or was uninstalled — the
    // merchant needs to run the install, not retry.
    const notLinked = res.status === 404 || res.status === 409
    return {
      ok: false,
      reason: notLinked ? "not_linked" : "unavailable",
      message: json.message || "Could not start your PingGo session.",
    }
  }

  const expiresAt = json.data.expiresAt ? Date.parse(json.data.expiresAt) : NaN
  const maxAge = Number.isFinite(expiresAt)
    ? Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
    : 7 * 24 * 60 * 60

  const store = await cookies()
  store.set(TOKEN_COOKIE, json.data.token, embeddedCookieOptions(maxAge))
  store.set(USER_ID_COOKIE, json.data.userId, embeddedCookieOptions(maxAge))
  // Remembered so the dashboard can name the store without another round trip.
  store.set(SHOP_COOKIE, shop, embeddedCookieOptions(maxAge))

  return { ok: true, shop, userId: json.data.userId }
}
