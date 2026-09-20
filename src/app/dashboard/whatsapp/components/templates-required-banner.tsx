"use client"

import Link from "next/link"

import { PinggoButton } from "@/components/pinggo-link"
import { PINGGO_PATHS } from "@/lib/pinggo-handoff"
import { useShopifyAutomations } from "./shopify-automation-provider"

/**
 * A merchant with no approved templates can enable every automation on the
 * page and still send nothing — the template picker is the wall they hit three
 * screens later. This says so up front, once, and disappears the moment they
 * have one.
 *
 * Deliberately not an error: nothing is broken, they just haven't done the
 * step that happens elsewhere yet.
 */
export function TemplatesRequiredBanner() {
  const { templates, loading, error } = useShopifyAutomations()

  // Nothing to claim while the list is still loading, and an outright load
  // failure is not the same as "you have none".
  if (loading || error || templates.length > 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-900">
          You don&apos;t have any approved WhatsApp templates yet
        </p>
        <p className="mt-0.5 text-[13px] text-amber-900/75">
          Automations can be set up, but they can&apos;t send a message until at
          least one template is approved by Meta. Templates are created in
          PingGo web —{" "}
          <Link
            href="/dashboard/whatsapp/templates"
            className="font-medium underline underline-offset-2"
          >
            see how it works
          </Link>
          .
        </p>
      </div>

      <PinggoButton
        path={PINGGO_PATHS.createTemplate}
        variant="outline"
        className="shrink-0 border-amber-300 bg-white/70 text-amber-900 hover:bg-white"
      >
        Create a template
      </PinggoButton>
    </div>
  )
}
