"use client"

import * as React from "react"
import { FileText, RefreshCw } from "lucide-react"

import { PinggoButton } from "@/components/pinggo-link"
import { Button } from "@/components/ui/button"
import { PINGGO_PATHS } from "@/lib/pinggo-handoff"
import { cn } from "@/lib/utils"
import { useShopifyAutomations } from "./shopify-automation-provider"

/**
 * Shown wherever a merchant needs a WhatsApp template and has none approved.
 *
 * Two things make this a dead end otherwise: templates can't be created here at
 * all (Meta has to approve them, which happens in PingGo web), and approval is
 * asynchronous — the merchant submits one, waits, and comes back. So the card
 * does both jobs: it sends them to the right screen, and it gives them a way to
 * pick the result up without hunting for a reload button.
 */
export function TemplatesEmptyState({ className }: { className?: string }) {
  const { reload } = useShopifyAutomations()
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await reload()
    } finally {
      setRefreshing(false)
    }
  }, [reload])

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-7 text-center",
        className
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <FileText className="size-[18px]" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">
          No approved templates yet
        </p>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          WhatsApp only delivers messages built from templates Meta has approved.
          Create your first one in PingGo web — once it&apos;s approved it shows
          up here automatically.
        </p>
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <PinggoButton path={PINGGO_PATHS.createTemplate}>
          Create a template
        </PinggoButton>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            data-icon="inline-start"
            className={cn(refreshing && "animate-spin")}
          />
          {refreshing ? "Checking…" : "Check again"}
        </Button>
      </div>
    </div>
  )
}
