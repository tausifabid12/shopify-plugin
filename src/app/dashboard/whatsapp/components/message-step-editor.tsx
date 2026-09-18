"use client"

import { Trash2 } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import type { MessageStep } from "@/lib/workflow/automation-draft"
import type { TemplateVariableValue } from "@/lib/workflow/flow-types"
import { getTemplateRequirements } from "@/lib/workflow/template-requirements"
import { useShopifyAutomations } from "./shopify-automation-provider"
import { StepTimingFields } from "./step-timing-fields"
import { TemplateExtraFields } from "./template-extra-fields"
import { TemplateVariableRow } from "./template-variable-row"

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
  variables: ITriggerVariable[]
}) {
  const { templates } = useShopifyAutomations()
  const requirements = getTemplateRequirements(step.template)
  const templateMissing = Boolean(step.templateId) && !templates.some((t) => t.id === step.templateId)

  const patch = (changes: Partial<MessageStep>) => onChange({ ...step, ...changes })

  function updateTemplate(value: string | null) {
    if (!value) return
    const tpl = templates.find((t) => t.id === value)
    patch({
      templateId: value,
      templateName: tpl?.name ?? "",
      template: tpl as unknown as Record<string, unknown>,
      variables: {},
      headerVariables: {},
      fileUrl: "",
      dynamicUrlSuffix: "",
      couponCode: "",
    })
  }

  const setBodyVariable = (key: string, value: TemplateVariableValue) =>
    patch({ variables: { ...step.variables, [key]: value } })
  const setHeaderVariable = (key: string, value: TemplateVariableValue) =>
    patch({ headerVariables: { ...step.headerVariables, [key]: value } })

  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
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
        <StepTimingFields step={step} isFirst={index === 0} onChange={patch} />

        {/* Template selector */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">Message template</Label>
          <Select value={step.templateId} onValueChange={updateTemplate}>
            <SelectTrigger className="h-9 w-full bg-background shadow-none">
              <SelectValue placeholder="Select a WhatsApp template">
                {step.templateName || undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  No approved templates available.
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
          {step.template ? (
            <p className="text-xs text-muted-foreground">
              {String(step.template.language ?? "")} · {String(step.template.category ?? "")}
              {templateMissing ? " · no longer approved — pick it again or choose another template" : ""}
            </p>
          ) : null}
          {requirements && !requirements.supported ? (
            <p className="text-xs text-destructive">
              Carousel, authentication and WhatsApp Flow templates must be configured in the PingGo flow builder.
            </p>
          ) : null}
        </div>

        {/* Variable mapping */}
        {requirements?.supported && requirements.headerKeys.length + requirements.bodyKeys.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Map template variables</Label>
            <p className="text-xs text-muted-foreground">
              Fill each placeholder with Shopify data or a static value.
            </p>
            {requirements.headerKeys.map((key) => (
              <TemplateVariableRow
                key={key}
                label={`Header {{${key.replace("header_", "")}}}`}
                value={step.headerVariables[key]}
                variables={variables}
                onChange={(v) => setHeaderVariable(key, v)}
              />
            ))}
            {requirements.bodyKeys.map((key) => (
              <TemplateVariableRow
                key={key}
                label={`Variable {{${key.replace("field_", "")}}}`}
                value={step.variables[key]}
                variables={variables}
                onChange={(v) => setBodyVariable(key, v)}
              />
            ))}
          </div>
        ) : null}

        {requirements?.supported ? (
          <TemplateExtraFields step={step} requirements={requirements} variables={variables} onChange={patch} />
        ) : null}
      </div>
    </div>
  )
}
