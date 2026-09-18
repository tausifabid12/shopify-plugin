"use client"

import * as React from "react"
import { Check, Loader2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

import { retryOrderAction } from "../actions"

/**
 * Manual recovery for an order Shopify rejected.
 *
 * This only appears once automatic retries have run out. By then the payment is
 * captured and the customer has been charged, so the merchant fixes whatever
 * Shopify objected to — usually an address or a deleted variant — and pushes it
 * through by hand.
 */
export function RetryButton({ id }: { id: string }) {
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<null | { ok: boolean; text: string }>(null)

  const retry = async () => {
    setBusy(true)
    setResult(null)
    const response = await retryOrderAction(id)
    setBusy(false)

    if (!response.ok) {
      setResult({ ok: false, text: response.error })
      return
    }
    setResult(
      response.data?.syncStatus === "created"
        ? { ok: true, text: "Order created" }
        : { ok: false, text: response.data?.lastError || "Still failing" }
    )
  }

  if (result?.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
        <Check className="size-3.5" />
        {result.text}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={retry} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />}
        Retry
      </Button>
      {result && !result.ok && (
        <span className="max-w-[16rem] text-right text-[11px] text-destructive">
          {result.text}
        </span>
      )}
    </div>
  )
}
