import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"

import { EmbeddedBootstrap } from "@/components/embedded-bootstrap"
import { PinggoAuthForm } from "@/components/pinggo-auth-form"
import { hasPinggoCredentials } from "@/lib/pinggo"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    shop?: string
    host?: string
    embedded?: string
    id_token?: string
  }>
}) {
  if (await hasPinggoCredentials()) {
    redirect("/dashboard")
  }

  const { shop, host, embedded, id_token: idToken } = await searchParams

  /**
   * Running inside the Shopify admin iframe.
   *
   * Shopify marks embedded loads with `embedded=1` and always sends `host`.
   * There is no usable cookie here — third-party cookies do not survive the
   * iframe — so instead of showing a sign-in form that could never persist a
   * session, hand over to the bootstrap: it trades Shopify's session token for
   * a PingGo one and moves on to the dashboard.
   */
  if (embedded === "1" || host) {
    return <EmbeddedBootstrap urlIdToken={idToken} shop={shop} />
  }

  return (
    <div className="flex min-h-svh">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-105 lg:shrink-0 lg:flex-col lg:justify-between bg-[#1a1a2e] px-10 py-12">
        <div className="flex items-center gap-3">
          {/* Shopify-style bag icon */}
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#008060]">
            <svg viewBox="0 0 24 24" className="size-5 fill-white">
              <path d="M15.337 6.293c-.15-.9-.674-1.68-1.424-2.18a2.99 2.99 0 0 0-3.826 0c-.75.5-1.274 1.28-1.424 2.18L7.5 6.75l-.75 10.5h10.5l-.75-10.5-1.163-.457ZM12 4.5a1.5 1.5 0 0 1 1.29.735c.207.343.296.747.247 1.147L12 5.925l-1.537.457a1.502 1.502 0 0 1 1.537-1.882Z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-white">PingGo</span>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white leading-snug">
              WhatsApp automation &<br />smart payments for your store
            </h2>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Connect your PingGo account to start sending order updates,
              recovering abandoned carts, and collecting payments — all over
              WhatsApp.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              "33+ WhatsApp automation triggers",
              "Abandoned cart recovery with AI",
              "UPI, cards & wallet payments",
              "Live shipment tracking alerts",
            ].map((point) => (
              <div key={point} className="flex items-center gap-3">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#008060]/30">
                  <svg viewBox="0 0 12 12" className="size-3 fill-[#00d4a1]">
                    <path d="M10.28 2.28 3.989 8.575 1.695 6.28A1 1 0 0 0 .28 7.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28 2.28Z" />
                  </svg>
                </div>
                <span className="text-sm text-white/70">{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/40">
          <ShieldCheck className="size-3.5" />
          SOC2-ready · data stays on your server
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f6f6f7] px-4 py-12 sm:px-8">
        <div className="w-full max-w-110">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-md bg-[#008060]">
              <svg viewBox="0 0 24 24" className="size-4 fill-white">
                <path d="M15.337 6.293c-.15-.9-.674-1.68-1.424-2.18a2.99 2.99 0 0 0-3.826 0c-.75.5-1.274 1.28-1.424 2.18L7.5 6.75l-.75 10.5h10.5l-.75-10.5-1.163-.457ZM12 4.5a1.5 1.5 0 0 1 1.29.735c.207.343.296.747.247 1.147L12 5.925l-1.537.457a1.502 1.502 0 0 1 1.537-1.882Z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-foreground">PingGo</span>
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">
              Connect your PingGo account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in or create a PingGo account to link your Shopify store.
            </p>
          </div>

          <PinggoAuthForm shop={shop} />
        </div>
      </div>
    </div>
  )
}
