import { NextResponse, type NextRequest } from "next/server"

import { getPinggoCredentials } from "@/lib/pinggo"
import { PINGGO_DASHBOARD_URL, safePinggoPath } from "@/lib/pinggo-handoff"

/**
 * Signs the merchant into PingGo web and lands them on a specific screen.
 *
 * Some things — creating and submitting WhatsApp templates for approval,
 * connecting a WhatsApp number, editing a flow built in the flow builder — only
 * exist in PingGo web. Sending merchants there shouldn't cost them a second
 * login, so this route hands their existing session over.
 *
 * The hand-off is a POST, not a redirect with the token in the query string.
 * The merchant's PingGo token lives in an httpOnly cookie precisely so page
 * scripts can't read it; putting it in a URL would leak it into browser
 * history, `Referer` headers and every access log between here and PingGo. So
 * this route returns a single-purpose page whose only job is to post the token
 * across and disappear. The token never appears in any URL, and never in the
 * markup of a page the merchant actually works in.
 *
 * @see pinggo-dashboard `src/app/api/sso/handoff/route.ts` for the other end.
 */

export const dynamic = "force-dynamic"

/** Escapes a value for use inside a double-quoted HTML attribute. */
function attr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET(request: NextRequest) {
  const next = safePinggoPath(request.nextUrl.searchParams.get("next"))
  const target = `${PINGGO_DASHBOARD_URL}/api/sso/handoff`

  const { apiKey } = await getPinggoCredentials()

  // No token to hand over — send them to PingGo anyway and let it ask for a
  // login. Landing on the right screen still beats a dead end.
  if (!apiKey) {
    return NextResponse.redirect(`${PINGGO_DASHBOARD_URL}${next}`, {
      status: 303,
      headers: { "Referrer-Policy": "no-referrer" },
    })
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Opening PingGo…</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #fbfbfa; color: #1a1a1a;
  }
  @media (prefers-color-scheme: dark) { body { background: #17171a; color: #ededed; } }
  .box { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px; text-align: center; }
  .spinner {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2.5px solid currentColor; border-top-color: transparent;
    opacity: .35; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
  p { margin: 0; }
  .muted { font-size: 13px; opacity: .6; }
  button {
    font: inherit; font-weight: 500; cursor: pointer;
    padding: 8px 14px; border-radius: 8px;
    border: 1px solid rgba(128,128,128,.35); background: transparent; color: inherit;
  }
</style>
</head>
<body>
  <div class="box">
    <div class="spinner" aria-hidden="true"></div>
    <p>Signing you in to PingGo…</p>
    <form id="handoff" method="POST" action="${attr(target)}">
      <input type="hidden" name="token" value="${attr(apiKey)}">
      <input type="hidden" name="next" value="${attr(next)}">
      <noscript>
        <p class="muted">JavaScript is turned off.</p>
        <button type="submit">Continue to PingGo</button>
      </noscript>
    </form>
  </div>
  <script>document.getElementById("handoff").submit();</script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Belt and braces with the <meta>: this document holds a bearer token, so
      // it must never be cached, never be stored and never name itself to the
      // destination.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
