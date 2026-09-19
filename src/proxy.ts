import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { appUrl } from "@/lib/app-url"

/**
 * Proxy (Next.js 16 replacement for middleware).
 *
 * Protects /dashboard/* — if the user has neither a PingGo session cookie
 * nor a Shopify OAuth session cookie they are redirected to the home /
 * onboarding page.
 *
 * Note: the proxy intentionally does NOT call `cookies()` from next/headers —
 * that helper is for Server Components / Server Actions only. Here we read
 * cookies directly from the request object via `request.cookies`.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (!pathname.startsWith("/dashboard")) {
        return NextResponse.next()
    }

    const hasPinggoSession =
        Boolean(request.cookies.get("pinggo_token")?.value) &&
        Boolean(request.cookies.get("pinggo_user_id")?.value)

    const hasShopifySession = Boolean(
        request.cookies.get("shopify_session")?.value
    )

    if (!hasPinggoSession && !hasShopifySession) {
        // Same reasoning as /api/auth: `request.url` is the upstream address
        // behind a proxy, so the redirect has to be built on the public origin.
        return NextResponse.redirect(appUrl(request, "/"))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match /dashboard and everything under it.
         * Exclude _next internals and static assets so the redirect logic
         * never accidentally intercepts CSS/JS/image requests.
         */
        "/dashboard/:path*",
    ],
}
