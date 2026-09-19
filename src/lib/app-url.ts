import type { NextRequest } from "next/server"

/**
 * The app's public origin.
 *
 * `request.url` is NOT safe to use for this. Behind a reverse proxy it carries
 * the upstream address the proxy dialled — `http://localhost:3003` in our
 * deployment — so any redirect built from it sends the browser to a host that
 * only exists inside the server. That silently breaks the whole Shopify install
 * flow, because Shopify hands control to `/api/auth` and we immediately bounce
 * the merchant to localhost.
 *
 * `APP_URL` is authoritative: it is the value registered with Shopify as the
 * App URL, so it is by definition the origin Shopify expects us to redirect
 * within. The forwarded headers are a fallback for environments where APP_URL
 * hasn't been set; `request.url` is the last resort and only correct when
 * there's no proxy at all.
 */
export function appOrigin(request: NextRequest): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "")
  if (configured && !configured.includes("your-app-domain")) {
    return configured
  }

  // Set by most reverse proxies. `x-forwarded-host` wins over `host` because
  // nginx commonly rewrites `Host` to the upstream.
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https"
    return `${proto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}

/** Builds an absolute URL on the app's public origin. */
export function appUrl(
  request: NextRequest,
  path: string,
  params?: Record<string, string>
): URL {
  const url = new URL(path, appOrigin(request))
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value)
  }
  return url
}
