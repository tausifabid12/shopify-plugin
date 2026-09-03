import type { NextRequest } from "next/server"

/**
 * GET /api/auth
 *
 * Entry-point for Shopify OAuth.  Shopify calls this URL (set as your "App URL"
 * in the Partner Dashboard) with:
 *   ?shop=<myshopify-domain>   e.g. my-store.myshopify.com
 *
 * We redirect the merchant to Shopify's permission screen.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const shop = searchParams.get("shop")

    if (!shop || !isValidShopDomain(shop)) {
        return Response.json(
            { error: "Missing or invalid `shop` query parameter." },
            { status: 400 }
        )
    }

    const apiKey = process.env.SHOPIFY_API_KEY
    const scopes = process.env.SHOPIFY_SCOPES
    const appUrl = process.env.APP_URL

    if (!apiKey || !scopes || !appUrl) {
        console.error(
            "[auth] Missing required env vars: SHOPIFY_API_KEY, SHOPIFY_SCOPES, APP_URL"
        )
        return Response.json(
            { error: "Server misconfiguration." },
            { status: 500 }
        )
    }

    const redirectUri = `${appUrl}/api/auth/callback`

    // A random nonce helps prevent CSRF on the callback
    const nonce = crypto.randomUUID()

    const installUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    installUrl.searchParams.set("client_id", apiKey)
    installUrl.searchParams.set("scope", scopes)
    installUrl.searchParams.set("redirect_uri", redirectUri)
    installUrl.searchParams.set("state", nonce)

    // Persist the nonce in a short-lived cookie so we can verify it on callback
    const response = Response.redirect(installUrl.toString(), 302)

    // Note: Response.redirect returns a plain Response; we need to cast to set
    // headers. We build it manually so we can attach Set-Cookie.
    return new Response(null, {
        status: 302,
        headers: {
            Location: installUrl.toString(),
            "Set-Cookie": buildNonceCookie(nonce),
        },
    })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Shopify shop domains are always *.myshopify.com.
 * Validate to avoid open-redirect attacks.
 */
function isValidShopDomain(shop: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)
}

function buildNonceCookie(nonce: string): string {
    const isProduction = process.env.NODE_ENV === "production"
    const parts = [
        `shopify_oauth_nonce=${nonce}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=300", // 5 minutes — more than enough for the OAuth round-trip
    ]
    if (isProduction) parts.push("Secure")
    return parts.join("; ")
}
