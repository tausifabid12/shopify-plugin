import type { Metadata } from "next"

import { CheckoutShell } from "@/components/checkout/checkout-shell"
import { CheckoutExpired } from "@/components/checkout/checkout-result"
import { brandingToCssVars } from "@/lib/checkout/theme"
import { fetchCheckout } from "@/lib/checkout/public-api"

/**
 * The hosted checkout — /checkout/<token>.
 *
 * Public and unauthenticated: the token in the URL is the credential. This
 * route deliberately reads no cookies and imports nothing from the dashboard's
 * auth layer, so there is no session for a shopper's browser to carry here.
 *
 * Rendered on the server for first paint (a checkout that flashes empty loses
 * conversions), then handed to the client shell for everything interactive.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Secure checkout",
  // Nothing about a live checkout should ever reach a search index.
  robots: { index: false, follow: false },
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let bootstrap
  try {
    bootstrap = await fetchCheckout(token)
  } catch {
    // Expired, cancelled, or never existed — all the same to a shopper, and we
    // deliberately don't distinguish them in the response either.
    return (
      <div style={FALLBACK_THEME}>
        <CheckoutExpired />
      </div>
    )
  }

  const status = bootstrap.session.status
  if (status === "expired" || status === "cancelled") {
    return (
      <div style={brandingToCssVars(bootstrap.config.branding)}>
        <CheckoutExpired config={bootstrap.config} />
      </div>
    )
  }

  return <CheckoutShell initial={bootstrap} />
}

/** Neutral palette for the case where we never loaded a merchant's branding. */
const FALLBACK_THEME = brandingToCssVars({
  primaryColor: "#008060",
  secondaryColor: "#004c3f",
  buttonColor: "#008060",
  buttonTextColor: "#ffffff",
  backgroundColor: "#f6f6f7",
  surfaceColor: "#ffffff",
  textColor: "#202223",
  mutedTextColor: "#6d7175",
  borderColor: "#e1e3e5",
  fontFamily: "system-ui",
  borderRadius: 8,
  layout: "single_column",
})
