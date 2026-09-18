"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import type { TemplateVariableValue } from "@/lib/workflow/flow-types"
import { VariablePicker } from "./variable-picker"

/** Maps one template placeholder to a Shopify field (with fallback) or a static value. */
export function TemplateVariableRow({
  label,
  value,
  variables,
  onChange,
  allowFallback = true,
}: {
  label: string
  value: TemplateVariableValue | undefined
  variables: ITriggerVariable[]
  onChange: (value: TemplateVariableValue) => void
  allowFallback?: boolean
}) {
  const [mode, setMode] = useState<"path" | "custom">(value?.isCustom ? "custom" : "path")
  const current = value ?? { value: "" }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 text-xs font-medium text-foreground">{label}</span>

        {mode === "custom" ? (
          <Input
            className="h-8 flex-1 bg-background shadow-none"
            placeholder="Static value"
            value={current.value}
            onChange={(e) => onChange({ value: e.target.value, isCustom: true })}
          />
        ) : (
          <VariablePicker
            value={current.value}
            variables={variables}
            onSelect={(path) => onChange({ value: path, fallback: current.fallback })}
            onClear={() => onChange({ value: "", fallback: current.fallback })}
          />
        )}

        <button
          type="button"
          onClick={() => {
            const next = mode === "custom" ? "path" : "custom"
            setMode(next)
            onChange(next === "custom" ? { value: "", isCustom: true } : { value: "" })
          }}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" />
          {mode === "custom" ? "Field" : "Static"}
        </button>
      </div>

      {mode === "path" && allowFallback ? (
        <div className="flex items-center gap-2 pl-30">
          <Input
            className="h-7 flex-1 bg-background text-xs shadow-none"
            placeholder="Fallback if the field is empty (optional)"
            value={current.fallback ?? ""}
            onChange={(e) => onChange({ value: current.value, fallback: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  )
}
