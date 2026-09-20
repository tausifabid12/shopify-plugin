/**
 * Deep links into PingGo web, with the merchant signed in on arrival.
 *
 * A handful of things live only in PingGo web — WhatsApp templates have to be
 * submitted to Meta for approval there, WhatsApp numbers are connected through
 * Facebook there, and flows built in the flow builder can only be edited there.
 * Every link out of this app to one of those screens goes through
 * `/api/pinggo/handoff`, which carries the merchant's session across so they
 * never see a login form.
 *
 * Paths below are PingGo web routes, not routes in this app.
 */

/** PingGo web origin, with any trailing slash removed. */
export const PINGGO_DASHBOARD_URL = (
  process.env.NEXT_PUBLIC_PINGGO_DASHBOARD_URL ?? ""
).replace(/\/+$/, "")

export const PINGGO_PATHS = {
  templates: "/whatsapp/templates",
  createTemplate: "/whatsapp/templates/create",
  /** Note the spelling — it matches the PingGo route, typo and all. */
  connectWhatsapp: "/whatsapp/connect-whastsapp-with-facebook",
  workflow: (workflowId: string) => `/webhooks-v2/${workflowId}`,
} as const

/**
 * Keeps `next` to a path on PingGo itself. `//evil.com` and `/\evil.com` are
 * both read as protocol-relative URLs by browsers, so neither gets through.
 */
export function safePinggoPath(raw: string | null | undefined): string {
  const value = raw?.trim() ?? ""
  if (!value.startsWith("/")) return "/dashboard"
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard"
  return value
}

/**
 * Link target for a PingGo screen. Points at this app's hand-off route rather
 * than at PingGo directly — the token is attached server-side, so it never
 * touches the markup of the page the merchant is on.
 */
export function pinggoHandoffHref(path: string): string {
  return `/api/pinggo/handoff?next=${encodeURIComponent(path)}`
}
