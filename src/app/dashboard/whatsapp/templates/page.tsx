"use client"

import * as React from "react"
import { FileText, Loader2, RefreshCw } from "lucide-react"

import { InlineAlert } from "@/components/inline-alert"
import { PinggoButton, PinggoLink } from "@/components/pinggo-link"
import { Button } from "@/components/ui/button"
import { PINGGO_PATHS } from "@/lib/pinggo-handoff"
import { cn } from "@/lib/utils"
import { useShopifyAutomations } from "../components/shopify-automation-provider"
import { TemplatesEmptyState } from "../components/templates-empty-state"

/**
 * Read-only view of the merchant's approved WhatsApp templates.
 *
 * Templates can't be authored here — Meta has to approve every one, and that
 * whole flow lives in PingGo web. What this page is for is answering the
 * question a merchant actually arrives with while building an automation:
 * "which templates can I pick from, and how do I get another one?" Showing the
 * list is the honest answer to the first half; the hand-off button is the
 * answer to the second.
 */
export default function TemplatesPage() {
  const { templates, loading, error, reload } = useShopifyAutomations()
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await reload()
    } finally {
      setRefreshing(false)
    }
  }, [reload])

  const sorted = React.useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name)),
    [templates]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="size-4 text-emerald-600" />
            </div>
            <h1 className="text-[22px] font-semibold text-foreground">
              Message templates
            </h1>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            The approved WhatsApp templates your automations can send. Templates
            are written and submitted for Meta approval in PingGo web — you
            stay signed in when you go there.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={cn(refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <PinggoButton path={PINGGO_PATHS.createTemplate}>
            Create a template
          </PinggoButton>
        </div>
      </div>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading templates…
        </div>
      ) : sorted.length === 0 ? (
        <TemplatesEmptyState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              {sorted.length} approved {sorted.length === 1 ? "template" : "templates"}
            </h2>
            <PinggoLink path={PINGGO_PATHS.templates} className="text-[13px]">
              Manage in PingGo
            </PinggoLink>
          </div>

          <ul className="divide-y divide-border">
            {sorted.map((template) => (
              <li
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {template.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[template.language, template.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  Approved
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why there's nothing to edit here. Sits below the list so it explains
          rather than blocks. */}
      <InlineAlert>
        <p className="font-medium">Templates are managed in PingGo web.</p>
        <p className="mt-1 text-muted-foreground">
          Writing a template, adding buttons or variables, and submitting it for
          Meta approval all happen there. Approved templates appear in this list
          and in every automation&apos;s template picker.
        </p>
        <PinggoLink path={PINGGO_PATHS.templates} className="mt-2 text-sm">
          Open templates in PingGo
        </PinggoLink>
      </InlineAlert>
    </div>
  )
}
