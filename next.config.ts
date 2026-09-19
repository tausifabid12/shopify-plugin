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

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins(),
    },
  },
}

export default nextConfig
