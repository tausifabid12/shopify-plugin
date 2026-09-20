import type { NextConfig } from "next"

/**
 * Hostnames Server Actions may be invoked from.
 *
 * Next compares the browser's `Origin` against the `Host` / `x-forwarded-host`
 * it received, and aborts the action on a mismatch as CSRF protection
 * (`action-handler.js` → "Invalid Server Actions request"). The client sees
 * nothing at all — the form simply does nothing — which makes this a genuinely
 * nasty one to diagnose.
 *
 * Behind a reverse proxy the two disagree whenever nginx forwards its own
 * upstream as the Host (its default is `Host: $proxy_host`, i.e.
 * `localhost:3003`). Listing the public hostname here makes the app work
 * regardless.
 *
 * This is a safety net, not the cure: the proxy should send
 * `proxy_set_header Host $host` — see SHOPIFY-SETUP.md. With that in place this
 * list is redundant, and it stays harmless.
 */
function allowedOrigins(): string[] {
  const origins = new Set<string>()

  for (const value of [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_CHECKOUT_APP_URL,
    // Escape hatch for extra hosts (staging, a tunnel), comma-separated.
    ...(process.env.SERVER_ACTION_ALLOWED_ORIGINS?.split(",") ?? []),
  ]) {
    const trimmed = value?.trim()
    if (!trimmed || trimmed.includes("your-app-domain") || trimmed.includes("your-tunnel")) {
      continue
    }
    try {
      // Accepts a full URL or a bare hostname — `allowedOrigins` wants hosts.
      origins.add(new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host)
    } catch {
      // Unparseable entry; skip rather than fail the build.
    }
  }

  return [...origins]
}

/**
 * Who may frame the checkout.
 *
 * The storefront modal puts /checkout/<token> in an iframe on the merchant's
 * own domain, so the browser needs explicit permission via `frame-ancestors`.
 * It has to be a real header — `frame-ancestors` is ignored in a <meta> tag —
 * which is why it lives here rather than being set per-request by the page.
 *
 * Default covers every Shopify-hosted storefront. Merchants on a custom domain
 * (most production stores) must be added via CHECKOUT_FRAME_ANCESTORS, comma
 * separated.
 *
 * KNOWN LIMITATION: this is one list for the whole deployment, not per
 * merchant. The right long-term fix is to resolve the allowed origins from the
 * session's own store record so each merchant only permits their own domain.
 * Until then, framing is bounded to storefront-shaped origins and the checkout
 * still requires an unguessable token, so an attacker gains nothing by framing
 * a page they cannot address.
 */
function frameAncestors(): string {
  const extra = (process.env.CHECKOUT_FRAME_ANCESTORS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return ["'self'", "https://*.myshopify.com", "https://admin.shopify.com", ...extra].join(" ")
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins(),
    },
  },

  async headers() {
    return [
      {
        source: "/checkout/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors()};`,
          },
        ],
      },
    ]
  },
}

export default nextConfig
