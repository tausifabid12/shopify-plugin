import type { NextRequest } from "next/server"

import { establishEmbeddedSession } from "@/lib/embedded-session"

/**
 * POST /api/shopify/session
 *
 * Exchanges an App Bridge session token for a PingGo session cookie, so the
 * dashboard can render inside the Shopify admin iframe.
 *
 * This lives in a Route Handler rather than the page that needs it because
 * `cookies().set()` is only permitted in Route Handlers and Server Actions —
 * a Server Component cannot write the cookie it is about to depend on.
 *
 * Authentication is the session token itself: it is signed with our client
 * secret and names the shop, so nothing else is required from the caller.
 * Anyone can *call* this; only a genuine Shopify token gets a session out.
 */
export async function POST(request: NextRequest) {
  let body: { idToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, message: "Expected a JSON body." }, { status: 400 })
  }

  const idToken = typeof body.idToken === "string" ? body.idToken.trim() : ""
  if (!idToken) {
    return Response.json({ ok: false, message: "Missing session token." }, { status: 400 })
  }

  const result = await establishEmbeddedSession(idToken)

  if (result.ok) {
    return Response.json({ ok: true, shop: result.shop })
  }

  /**
   * Status codes chosen so the client knows what to do next:
   *   401 — token stale or bad; ask App Bridge for a fresh one and retry once
   *   409 — the store was never linked; the merchant must run the install
   *   503 — our side is unavailable; show a retry
   */
  const status =
    result.reason === "invalid_token" ? 401 : result.reason === "not_linked" ? 409 : 503

  return Response.json(
    { ok: false, reason: result.reason, message: result.message },
    { status }
  )
}
