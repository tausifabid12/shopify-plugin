"use client"

import { AlertTriangle, Loader2, Store } from "lucide-react"

import { whatsappFeatureSections } from "@/lib/whatsapp-features"
import { useShopifyAutomations } from "./shopify-automation-provider"
import { FeatureGridCard } from "./feature-grid-card"

export function FeatureSectionGrid() {
  const { loading, error, store } = useShopifyAutomations()
  const storeDisconnected = !loading && !error && store?.status !== "active"

  return (
    <div className="flex flex-col gap-10">
      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading automation status…
        </div>
      )}

      {/* API error — non-blocking, cards still render */}
      {!loading && error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Could not reach PingGo API</strong> — {error}. Toggles may
            not save until the connection is restored.
          </span>
        </div>
      )}

      {/* Store not linked — automations cannot receive Shopify events */}
      {storeDisconnected && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
          <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <strong>Your Shopify store isn&apos;t connected.</strong> Open PingGo from
            your Shopify admin to install the app, then enable automations here.
          </span>
        </div>
      )}

      {whatsappFeatureSections.map((section) => (
        <section key={section.title} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
              {section.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {section.items.length} features
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.items.map((feature) => (
              <FeatureGridCard key={feature.id} feature={feature} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
