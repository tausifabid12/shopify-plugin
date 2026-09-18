import type { Metadata } from "next"

import { CheckoutExpired } from "@/components/checkout/checkout-result"
import { fetchCheckout } from "@/lib/checkout/public-api"
import { brandingToCssVars } from "@/lib/checkout/theme"

import { ReturnClient } from "./return-client"

/**
 * /checkout/<token>/return — where gateways send the shopper back.
 *
 * The server fetches only the merchant's branding, so the page is painted in
 * their colours the instant it loads rather than flashing an unstyled spinner
 * at someone who has just parted with money. The outcome itself is resolved
 * client-side, because it involves polling.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Confirming payment",
  robots: { index: false, follow: false },
}

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token } = await params
  const query = await searchParams

  const rawRef = query.ref
  const attemptRef = Array.isArray(rawRef) ? rawRef[0] : rawRef

  let bootstrap
  try {
    bootstrap = await fetchCheckout(token)
  } catch {
    return (
      <div style={FALLBACK_THEME}>
        <CheckoutExpired />
      </div>
    )
  }

  return (
    <ReturnClient token={token} attemptRef={attemptRef} config={bootstrap.config} />
  )
}

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
