"use client"

import * as React from "react"
import { Check, Loader2, TriangleAlert, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/checkout/money"
import type { RefundRow, TransactionRow } from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import { createRefundAction } from "../../actions"
import { DateTime, Money, Panel, StatusBadge } from "../../components/ui"

/**
 * Refunds for one transaction (§18).
 *
 * The amount is entered in major units for the merchant and converted to paise
 * before it leaves the browser, because everything below this line is integer
 * minor units.
 *
 * The remaining balance is displayed and the input is capped, but the real
 * guard is server-side: a conditional `$inc` that cannot let concurrent refunds
 * exceed what was captured. This form is a convenience, not the control.
 */

export function RefundPanel({
  transaction,
  refunds: initialRefunds,
}: {
  transaction: TransactionRow
  refunds: RefundRow[]
}) {
  const [refunds, setRefunds] = React.useState(initialRefunds)
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<
    { tone: "ok" | "error"; text: string } | null
  >(null)

  const refundedSoFar = refunds
    .filter((r) => r.status === "succeeded" || r.status === "pending" || r.status === "processing")
    .reduce((sum, r) => sum + r.amount, 0)

  const remaining = Math.max(0, transaction.amount - Math.max(refundedSoFar, transaction.amountRefunded))
  const refundable =
    remaining > 0 &&
    (transaction.status === "success" || transaction.status === "partially_refunded")

  const submit = async (full: boolean) => {
    setBusy(true)
    setMessage(null)

    let minor: number | undefined
    if (!full) {
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setBusy(false)
        setMessage({ tone: "error", text: "Enter an amount to refund." })
        return
      }
      minor = Math.round(parsed * 100)
      if (minor > remaining) {
        setBusy(false)
        setMessage({
          tone: "error",
          text: `The most you can refund is ${formatMoney(remaining, transaction.currency)}.`,
        })
        return
      }
    }

    const result = await createRefundAction({
      transactionId: transaction._id,
      amount: minor,
      reason: reason.trim() || undefined,
    })

    setBusy(false)

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error })
      return
    }

    setRefunds((list) => [result.data, ...list])
    setAmount("")
    setReason("")
    setOpen(false)
    setMessage({
      tone: "ok",
      text:
        result.data.status === "succeeded"
          ? "Refund completed."
          : "Refund submitted — the gateway will confirm shortly.",
    })
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Refunds</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {remaining > 0 ? (
              <>
                <Money amount={remaining} currency={transaction.currency} /> still
                refundable
              </>
            ) : (
              "Fully refunded"
            )}
          </p>
        </div>

        {refundable && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Undo2 />
            Refund
          </Button>
        )}
      </div>

      {message && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px]",
            message.tone === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          )}
        >
          {message.tone === "ok" ? (
            <Check className="mt-px size-3.5 shrink-0" />
          ) : (
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground">
              Amount ({transaction.currency})
            </span>
            <Input
              inputMode="decimal"
              value={amount}
              placeholder={(remaining / 100).toFixed(2)}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground">
              Reason (optional)
            </span>
            <Input
              value={reason}
              placeholder="Customer returned the item"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <p className="text-[11.5px] text-muted-foreground">
            Refunds are sent straight to the gateway and can&apos;t be undone.
            The money returns to the customer&apos;s original payment method.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => submit(false)} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Refund amount
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => submit(true)}
              disabled={busy}
            >
              Refund all ({formatMoney(remaining, transaction.currency)})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                setMessage(null)
              }}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {refunds.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2.5 border-t border-border pt-3.5">
          {refunds.map((refund) => (
            <li
              key={refund._id}
              className="flex flex-wrap items-center justify-between gap-2 text-[13px]"
            >
              <div className="flex items-center gap-2.5">
                <StatusBadge status={refund.status} />
                <span className="font-medium tabular-nums">
                  {formatMoney(refund.amount, refund.currency)}
                </span>
                {refund.reason && (
                  <span className="text-muted-foreground">{refund.reason}</span>
                )}
              </div>
              <span className="text-[12px] text-muted-foreground">
                <DateTime value={refund.processedAt ?? refund.createdAt} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
