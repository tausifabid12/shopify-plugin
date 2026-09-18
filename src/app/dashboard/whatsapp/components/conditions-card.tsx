"use client"

import { Filter, Plus } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import {
  emptyCondition,
  type AutomationDraft,
  type ConditionDraft,
  type ConditionMatch,
} from "@/lib/workflow/automation-draft"
import { ConditionRow } from "./condition-row"

const matchLabels: Record<ConditionMatch, string> = {
  all: "all conditions match",
  any: "any condition matches",
}

/** Entry conditions — become Webhooks V2 condition nodes placed before the first message. */
export function ConditionsCard({
  draft,
  variables,
  onChange,
}: {
  draft: AutomationDraft
  variables: ITriggerVariable[]
  onChange: (patch: Partial<AutomationDraft>) => void
}) {
  const setConditions = (conditions: ConditionDraft[]) => onChange({ conditions })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Conditions</p>
        </div>
        {draft.conditions.length > 1 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Send only when
            <Select
              value={draft.conditionMatch}
              onValueChange={(v) => v && onChange({ conditionMatch: v as ConditionMatch })}
            >
              <SelectTrigger className="h-8 w-48 bg-background shadow-none">
                <SelectValue>{matchLabels[draft.conditionMatch]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(matchLabels) as ConditionMatch[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {matchLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {draft.conditions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Every event sends these messages. Add a condition to send only for some — for
          example, cash-on-delivery orders or shipments that are out for delivery.
        </p>
      ) : (
        draft.conditions.map((rule) => (
          <ConditionRow
            key={rule.id}
            rule={rule}
            variables={variables}
            onChange={(next) => setConditions(draft.conditions.map((r) => (r.id === rule.id ? next : r)))}
            onRemove={() => setConditions(draft.conditions.filter((r) => r.id !== rule.id))}
          />
        ))
      )}

      <button
        type="button"
        onClick={() => setConditions([...draft.conditions, emptyCondition()])}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
      >
        <Plus className="size-3.5" />
        Add condition
      </button>
    </div>
  )
}
