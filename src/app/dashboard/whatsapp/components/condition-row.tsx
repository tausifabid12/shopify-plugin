"use client"

import { Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import type { ConditionDraft } from "@/lib/workflow/automation-draft"
import {
  conditionOperatorOptions,
  operatorNeedsValue,
  type ConditionOperator,
} from "@/lib/workflow/condition-operators"
import { VariablePicker } from "./variable-picker"

export function ConditionRow({
  rule,
  variables,
  onChange,
  onRemove,
}: {
  rule: ConditionDraft
  variables: ITriggerVariable[]
  onChange: (rule: ConditionDraft) => void
  onRemove: () => void
}) {
  const operatorLabel = conditionOperatorOptions.find((o) => o.value === rule.operator)?.label

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <VariablePicker
        className="min-w-48"
        value={rule.variable}
        variables={variables}
        onSelect={(path) => onChange({ ...rule, variable: path })}
      />
      <Select
        value={rule.operator}
        onValueChange={(v) => {
          if (!v) return
          const operator = v as ConditionOperator
          onChange({ ...rule, operator, value: operatorNeedsValue(operator) ? rule.value : "" })
        }}
      >
        <SelectTrigger className="h-8 w-40 bg-background shadow-none">
          <SelectValue>{operatorLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {conditionOperatorOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {operatorNeedsValue(rule.operator) ? (
        <Input
          className="h-8 min-w-32 flex-1 bg-background shadow-none"
          placeholder="Value"
          value={rule.value}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
        />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove condition"
        className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
