"use client"

import { useEffect, useState } from "react"
import { Activity, Loader2, RefreshCw } from "lucide-react"

import { fetchFlowExecutions, type FlowMessageStatus, type IFlowExecution } from "@/lib/pinggo-api"
import type { IShopifyAutomation } from "@/lib/shopify-app-api"
import { cn } from "@/lib/utils"
import { useShopifyAutomations } from "./shopify-automation-provider"

const statusTone: Record<FlowMessageStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  skipped: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  delivered: "bg-primary/10 text-primary",
  read: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
}

function maskPhone(phone: string) {
  return phone.length > 6 ? `${phone.slice(0, 3)}••••${phone.slice(-3)}` : phone
}

/** Latest Webhooks V2 executions for this automation (execution report API). */
export function RecentActivityCard({ automation }: { automation: IShopifyAutomation }) {
  const { apiKey } = useShopifyAutomations()
  const [executions, setExecutions] = useState<IFlowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    fetchFlowExecutions(apiKey, automation.workflowId)
      .then((list) => {
        if (cancelled) return
        setExecutions(list)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load recent activity.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey, automation.workflowId, refreshKey])

  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setRefreshKey((k) => k + 1)
          }}
          aria-label="Refresh activity"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-5 py-4 text-sm">
        {automation.lastRunStatus && automation.lastRunStatus !== "started" && automation.lastError ? (
          <p className="text-xs text-destructive">Last event: {automation.lastError}</p>
        ) : null}

        {loading && executions.length === 0 ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : executions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No messages yet. Activity appears here after the next matching Shopify event.
          </p>
        ) : (
          executions.map((execution) => (
            <div key={execution._id} className="flex flex-wrap items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
              <span className="font-mono text-xs text-foreground">{maskPhone(execution.contactPhone)}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(execution.createdAt).toLocaleString()}
              </span>
              <div className="ml-auto flex flex-wrap gap-1">
                {execution.followUpLogs.length === 0 ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {execution.isCompleted ? "not sent · conditions not met" : "processing"}
                  </span>
                ) : null}
                {execution.followUpLogs.map((log) => (
                  <span
                    key={`${log.nodeId}-${log.order}`}
                    title={log.errorMessage || log.templateName}
                    className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone[log.status])}
                  >
                    #{log.order} {log.status}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
