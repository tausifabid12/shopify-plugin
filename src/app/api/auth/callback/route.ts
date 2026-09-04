import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { pinggoLinkStoreRequest } from "@/lib/pinggo-auth"

const SHOPIFY_SESSION_COOKIE = "shopify_session"
const NONCE_COOKIE = "shopify_oauth_nonce"
const PINGGO_TOKEN_COOKIE = "pinggo_token"

/**
 * GET /api/auth/callback
 *
 * Shopify redirects here after the merchant approves the app install:
 *   ?code=<auth_code>&hmac=<hmac>&shop=<shop>&state=<nonce>&...
 *
 * Steps:
 *  1. Verify the HMAC signature to confirm the request genuinely came from Shopify.
 *  2. Verify the `state` nonce matches what we set in the install cookie.
 *  3. Exchange the `code` for a permanent access token.
 *  4. Store the shop + access token in a secure HTTP-only session cookie.
 *  5. Redirect the merchant into the dashboard.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl

    const shop = searchParams.get("shop") ?? ""
    const code = searchParams.get("code") ?? ""
    const state = searchParams.get("state") ?? ""
    const hmac = searchParams.get("hmac") ?? ""

    const apiSecret = process.env.SHOPIFY_API_SECRET
    const apiKey = process.env.SHOPIFY_API_KEY
    const appUrl = process.env.APP_URL

    if (!apiSecret || !apiKey || !appUrl) {
        console.error("[callback] Missing required env vars.")
        return Response.json({ error: "Server misconfiguration." }, { status: 500 })
    }

    // ── 1. Validate HMAC ──────────────────────────────────────────────────────
    const isValidHmac = await verifyShopifyHmac(
        searchParams,
        hmac,
        apiSecret
    )
    if (!isValidHmac) {
        return Response.json(
            { error: "HMAC validation failed." },
            { status: 403 }
        )
    }

    // ── 2. Validate nonce (CSRF protection) ──────────────────────────────────
    const cookieStore = await cookies()
    const savedNonce = cookieStore.get(NONCE_COOKIE)?.value

    if (!savedNonce || savedNonce !== state) {
        return Response.json(
            { error: "State/nonce mismatch. Possible CSRF attempt." },
            { status: 403 }
        )
    }

    // ── 3. Exchange code for permanent access token ───────────────────────────
    let accessToken: string
    let scope = searchParams.get("scope") ?? ""
    let storeId: string | undefined

    try {
        const exchange = await exchangeCodeForToken({ shop, code, apiKey, apiSecret })
        accessToken = exchange.accessToken
        scope = exchange.scope || scope
        storeId = exchange.storeId
    } catch (err) {
        console.error("[callback] Token exchange failed:", err)
        return Response.json(
            { error: "Failed to obtain access token from Shopify." },
            { status: 502 }
        )
    }

    // ── 4. Link the store to the authenticated PingGo user (server-side) ──────
    const pinggoToken = cookieStore.get(PINGGO_TOKEN_COOKIE)?.value
    if (pinggoToken) {
        try {
            await pinggoLinkStoreRequest(pinggoToken, {
                shopDomain: shop,
                shopUrl: `https://${shop}`,
                accessToken,
                storeId,
                scope,
            })
        } catch (err) {
            // Non-fatal: the local session still works, but log for visibility.
            console.error("[callback] Failed to link Shopify store to PingGo:", err)
        }
    }

    // ── 5. Persist session & clear the nonce cookie ───────────────────────────
    // The access token is stored server-side (via /shopify/link above) and is
    // intentionally NOT persisted to the browser. This cookie only carries
    // non-sensitive store metadata for the dashboard UI.
    const sessionPayload = JSON.stringify({ shop, storeId, scope })
    const isProduction = process.env.NODE_ENV === "production"

    const sessionCookieParts = [
        `${SHOPIFY_SESSION_COOKIE}=${encodeURIComponent(sessionPayload)}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        `Max-Age=${60 * 60 * 24 * 30}`, // 30 days
    ]
    if (isProduction) sessionCookieParts.push("Secure")

    // Expire the nonce cookie
    const clearNonceParts = [
        `${NONCE_COOKIE}=`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=0",
    ]
    if (isProduction) clearNonceParts.push("Secure")

    // ── 5. Redirect into the app ──────────────────────────────────────────────
    return new Response(null, {
        status: 302,
        headers: new Headers([
            ["Location", `${appUrl}/dashboard`],
            ["Set-Cookie", sessionCookieParts.join("; ")],
            ["Set-Cookie", clearNonceParts.join("; ")],
        ]),
    })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Exchange the one-time OAuth code for a permanent offline access token.
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-token-types/get-offline-access-tokens
 */
async function exchangeCodeForToken({
    shop,
    code,
    apiKey,
    apiSecret,
}: {
    shop: string
    code: string
    apiKey: string
    apiSecret: string
}): Promise<{ accessToken: string; scope?: string; storeId?: string }> {
    const res = await fetch(
        `https://${shop}/admin/oauth/access_token`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: apiKey,
                client_secret: apiSecret,
                code,
            }),
        }
    )

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Shopify returned ${res.status}: ${text}`)
    }

    const json = await res.json() as {
        access_token?: string
        scope?: string
        associated_user_scope?: string
    }

    if (!json.access_token) {
        throw new Error("No access_token in Shopify response.")
    }

    return {
        accessToken: json.access_token,
        scope: json.scope,
        storeId: await fetchStoreId(shop, json.access_token),
    }
}

/** Resolve the Shopify store id (gid://shopify/Shop/<id>) for a given shop. */
async function fetchStoreId(shop: string, accessToken: string): Promise<string | undefined> {
    try {
        const res = await fetch(
            `https://${shop}/admin/api/2024-04/shop.json`,
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        )
        if (!res.ok) return undefined
        const json = await res.json() as { shop?: { id?: string } }
        return json.shop?.id ? String(json.shop.id) : undefined
    } catch {
        return undefined
    }
}

/**
 * Verify the HMAC that Shopify attaches to every OAuth callback.
 *
 * Algorithm:
 *  1. Remove the `hmac` param from the query string.
 *  2. Sort remaining params alphabetically and join as key=value&key=value.
 *  3. HMAC-SHA256 the result with the app secret.
 *  4. Compare with the provided hmac (timing-safe).
 *
 * https://shopify.dev/docs/apps/build/authentication-authorization/oauth/validate-url-callback
 */
async function verifyShopifyHmac(
    searchParams: URLSearchParams,
    receivedHmac: string,
    secret: string
): Promise<boolean> {
    // Build sorted message (exclude hmac itself)
    const params: string[] = []
    searchParams.forEach((value, key) => {
        if (key !== "hmac") params.push(`${key}=${value}`)
    })
    params.sort()
    const message = params.join("&")

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const msgData = encoder.encode(message)

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
    const computedHmac = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

    // Timing-safe comparison
    if (computedHmac.length !== receivedHmac.length) return false

    let mismatch = 0
    for (let i = 0; i < computedHmac.length; i++) {
        mismatch |= computedHmac.charCodeAt(i) ^ receivedHmac.charCodeAt(i)
    }
    return mismatch === 0
}
