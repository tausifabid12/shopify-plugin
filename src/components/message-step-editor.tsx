"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Trash2, X } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useShopifyDefinitions } from "@/components/shopify-definitions-provider"
import {
  customUnitOptions,
  type MessageStep,
  type TemplateVariableValue,
} from "@/lib/automation"
import type { IVariableDefinition } from "@/lib/pinggo-api"

function countTemplateVariables(components: Array<Record<string, unknown>> | undefined): number {
  if (!components) return 0
  const body = components.find((c) => c.type === "BODY")
  const text = typeof body?.text === "string" ? body.text : ""
  return (text.match(/\{\{\d+\}\}/g) ?? []).length
}

export function MessageStepEditor({
  step,
  index,
  onChange,
  onRemove,
  removable,
  variables,
}: {
  step: MessageStep
  index: number
  onChange: (step: MessageStep) => void
  onRemove: () => void
  removable: boolean
  variables: IVariableDefinition[]
}) {
  const { templates } = useShopifyDefinitions()
  const selectedTemplate = templates.find((t) => t.id === step.templateId)
  const variableCount = countTemplateVariables(selectedTemplate?.components)

  const variableKeys = useMemo(() => {
    return Array.from({ length: variableCount }, (_, i) => `field_${i + 1}`)
  }, [variableCount])

  const [varSearch, setVarSearch] = useState("")

  function updateTemplate(value: string | null) {
    if (!value) return
    const tpl = templates.find((t) => t.id === value)
    onChange({
      ...step,
      templateId: value,
      templateName: tpl?.name ?? "",
      template: tpl as unknown as Record<string, unknown>,
      variables: {},
    })
  }

  function setVariable(key: string, value: TemplateVariableValue) {
    onChange({ ...step, variables: { ...step.variables, [key]: value } })
  }

  const filteredVariables = useMemo(() => {
    const q = varSearch.toLowerCase()
    return variables.filter(
      (v) =>
        v.path.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)
    )
  }, [variables, varSearch])

  return (
    <div className="rounded-xl border border-border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-full bg-[#008060] text-[11px] font-semibold text-white">
            {index + 1}
          </div>
          <h3 className="text-sm font-semibold text-foreground">Message {index + 1}</h3>
        </div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove message"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Template selector */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">Message template</Label>
          <Select value={step.templateId} onValueChange={updateTemplate}>
            <SelectTrigger className="h-9 w-full bg-white shadow-none">
              <SelectValue placeholder="Select a WhatsApp template" />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  No templates available.
                </div>
              ) : (
                templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-xs text-muted-foreground">
              {selectedTemplate.status} · {selectedTemplate.language} · {selectedTemplate.category}
            </p>
          )}
        </div>

        {/* Webhook variable mapping */}
        {selectedTemplate && variableCount > 0 && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Map template variables</Label>
            <p className="text-xs text-muted-foreground">
              Map each template variable to a webhook field.
            </p>
            {variableKeys.map((key) => (
              <VariableRow
                key={key}
                label={`Variable {{${key.replace("field_", "")}}}`}
                value={step.variables[key]?.value ?? ""}
                variables={filteredVariables}
                onSearchChange={setVarSearch}
                onSelect={(path) => setVariable(key, { value: path })}
                onClear={() => setVariable(key, { value: "" })}
                onUseCustom={(custom) => setVariable(key, { value: custom, isCustom: true })}
              />
            ))}
          </div>
        )}

        {/* Timing (delay before this message) */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">Send timing</Label>
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Delay amount</Label>
              <Input
                type="number"
                min="0"
                value={step.delayAmount}
                onChange={(e) =>
                  onChange({ ...step, delayAmount: Number(e.target.value) || 0 })
                }
                className="h-9 bg-white shadow-none"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <Select
                value={step.delayUnit}
                onValueChange={(v) =>
                  v && onChange({ ...step, delayUnit: v as MessageStep["delayUnit"] })
                }
              >
                <SelectTrigger className="h-9 w-full bg-white shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customUnitOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {index === 0 && step.delayAmount === 0 && (
            <p className="text-xs text-muted-foreground">
              This message sends immediately when the webhook fires.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function VariableRow({
  label,
  value,
  variables,
  onSearchChange,
  onSelect,
  onClear,
  onUseCustom,
}: {
  label: string
  value: string
  variables: IVariableDefinition[]
  onSearchChange: (q: string) => void
  onSelect: (path: string) => void
  onClear: () => void
  onUseCustom: (custom: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"path" | "custom">("path")

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <span className="w-28 shrink-0 text-xs font-medium text-foreground">{label}</span>

      {mode === "custom" ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            className="h-8 flex-1 bg-white shadow-none"
            placeholder="Static value"
            value={value}
            onChange={(e) => onUseCustom(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              setMode("path")
              onClear()
            }}
            className="text-xs text-[#008060] hover:underline"
          >
            Use webhook field
          </button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex h-8 flex-1 items-center justify-between rounded-md border border-border bg-white px-2.5 text-left text-sm shadow-none hover:bg-muted/30"
              >
                <span className="truncate font-mono text-xs">
                  {value ? `{{${value}}}` : "Select a webhook field…"}
                </span>
                {value ? (
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                ) : (
                  <Search className="size-3.5 text-muted-foreground" />
                )}
              </button>
            }
          />
          <PopoverContent align="start" side="bottom" className="w-80 p-0">
            <div className="border-b border-border p-2">
              <Input
                autoFocus
                className="h-8 text-xs shadow-none"
                placeholder="Search webhook fields…"
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
              {variables.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No webhook fields available.
                </p>
              ) : (
                variables.map((v) => (
                  <button
                    key={v.path}
                    type="button"
                    onClick={() => {
                      onSelect(v.path)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50"
                  >
                    <code className="shrink-0 font-mono text-[11px] text-[#008060]">
                      {`{{${v.path}}}`}
                    </code>
                    <span className="truncate text-xs text-muted-foreground">{v.label}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <button
        type="button"
        onClick={() => {
          if (mode === "custom") {
            setMode("path")
            onClear()
          } else {
            setMode("custom")
            onUseCustom("")
          }
        }}
        className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3" />
        {mode === "custom" ? "Field" : "Static"}
      </button>
    </div>
  )
}
