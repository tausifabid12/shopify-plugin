import crypto from "node:crypto"

/**
 * Verification of Shopify session tokens (the embedded app "ID token").
 *
 * App Bridge mints one of these per request, signed HS256 with the app's client
 * secret and valid for about a minute. It is the only thing an embedded app
 * gets that proves *which shop and which staff member* is asking — third-party
 * cookies do not survive the admin iframe, so nothing else is available.
 *
 * Verified by hand rather than with a JWT library: the app has no JWT
 * dependency and this is ~40 lines of `node:crypto`, all of it checks we'd have
 * to write anyway. Every claim below is validated; skipping any one of them
 * turns "prove you are this shop" into "claim you are this shop".
 */

export interface ShopifySessionToken {
  /** e.g. "https://my-store.myshopify.com/admin" */
  iss: string
  /** e.g. "https://my-store.myshopify.com" */
  dest: string
  /** The app's client ID. */
  aud: string
  /** The staff member's user id, scoped to the shop. */
  sub: string
  exp: number
  nbf: number
  iat: number
  jti: string
  /** Shopify's session id for this admin session. */
  sid: string
}

export class SessionTokenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SessionTokenError"
  }
}

function base64UrlDecode(segment: string): Buffer {
  return Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

/**
 * Verifies a session token and returns its claims.
 *
 * `leewaySeconds` absorbs clock skew between Shopify and this server. These
 * tokens live about a minute, so without a little slack a server running a few
 * seconds fast rejects perfectly good tokens.
 */
export function verifySessionToken(
  token: string,
  options: { apiKey: string; apiSecret: string; leewaySeconds?: number }
): ShopifySessionToken {
  const leeway = options.leewaySeconds ?? 10

  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new SessionTokenError("Malformed session token.")
  }
  const [headerSegment, payloadSegment, signatureSegment] = parts

  // ── Signature ───────────────────────────────────────────────────────────────
  let header: { alg?: string; typ?: string }
  try {
    header = JSON.parse(base64UrlDecode(headerSegment).toString("utf8"))
  } catch {
    throw new SessionTokenError("Unreadable session token header.")
  }

  // Pinned, not read from the token. Accepting the token's own `alg` is the
  // classic JWT confusion bug — "none" or an RS256 swap would bypass this.
  if (header.alg !== "HS256") {
    throw new SessionTokenError("Unexpected session token algorithm.")
  }

  const expected = crypto
    .createHmac("sha256", options.apiSecret)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest()
  const presented = base64UrlDecode(signatureSegment)

  if (
    expected.length !== presented.length ||
    !crypto.timingSafeEqual(expected, presented)
  ) {
    throw new SessionTokenError("Session token signature did not match.")
  }

  // ── Claims ──────────────────────────────────────────────────────────────────
  let claims: ShopifySessionToken
  try {
    claims = JSON.parse(base64UrlDecode(payloadSegment).toString("utf8"))
  } catch {
    throw new SessionTokenError("Unreadable session token payload.")
  }

  const now = Math.floor(Date.now() / 1000)

  if (typeof claims.exp !== "number" || claims.exp + leeway < now) {
    throw new SessionTokenError("Session token has expired.")
  }
  if (typeof claims.nbf === "number" && claims.nbf - leeway > now) {
    throw new SessionTokenError("Session token is not valid yet.")
  }

  // Without this, a token minted for a *different* app would verify here as
  // long as that app shared our secret — which is exactly what `aud` is for.
  if (claims.aud !== options.apiKey) {
    throw new SessionTokenError("Session token was issued for another app.")
  }

  // `iss` and `dest` must name the same shop. They differ by design (`iss` has
  // the /admin path), so compare hosts.
  let issuerHost: string
  let destHost: string
  try {
    issuerHost = new URL(claims.iss).host
    destHost = new URL(claims.dest).host
  } catch {
    throw new SessionTokenError("Session token has malformed shop claims.")
  }
  if (issuerHost !== destHost) {
    throw new SessionTokenError("Session token shop claims disagree.")
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(destHost)) {
    throw new SessionTokenError("Session token names an unexpected shop.")
  }

  return claims
}

/** The `<shop>.myshopify.com` a verified token belongs to. */
export function shopFromSessionToken(claims: ShopifySessionToken): string {
  return new URL(claims.dest).host.toLowerCase()
}
