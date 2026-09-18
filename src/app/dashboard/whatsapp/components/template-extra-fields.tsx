"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import type { MessageStep } from "@/lib/workflow/automation-draft"
import type { TemplateVariableValue } from "@/lib/workflow/flow-types"
import type { TemplateRequirements } from "@/lib/workflow/template-requirements"
import { TemplateVariableRow } from "./template-variable-row"

/**
 * Header media and button values. Button values are stored as plain strings:
 * the executor resolves them as a payload path, or uses them literally.
 */
export function TemplateExtraFields({
  step,
  requirements,
  variables,
  onChange,
}: {
  step: MessageStep
  requirements: TemplateRequirements
  variables: ITriggerVariable[]
  onChange: (patch: Partial<MessageStep>) => void
}) {
  const asMapping = (raw: string): TemplateVariableValue | undefined => {
    if (!raw) return undefined
    return variables.some((v) => v.path === raw) ? { value: raw } : { value: raw, isCustom: true }
  }

  if (!requirements.needsHeaderMedia && !requirements.needsDynamicUrl && !requirements.needsCouponCode) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">Header & buttons</Label>

      {requirements.needsHeaderMedia ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <span className="text-xs font-medium text-foreground">
            Header {requirements.analysis.headerFormat ?? "media"} URL
          </span>
          <Input
            type="url"
            className="h-8 bg-background shadow-none"
            placeholder="https://…"
            value={step.fileUrl}
            onChange={(e) => onChange({ fileUrl: e.target.value })}
          />
        </div>
      ) : null}

      {requirements.needsDynamicUrl ? (
        <TemplateVariableRow
          label="Button link"
          value={asMapping(step.dynamicUrlSuffix)}
          variables={variables}
          allowFallback={false}
          onChange={(v) => onChange({ dynamicUrlSuffix: v.value })}
        />
      ) : null}

      {requirements.needsCouponCode ? (
        <TemplateVariableRow
          label="Coupon code"
          value={asMapping(step.couponCode)}
          variables={variables}
          allowFallback={false}
          onChange={(v) => onChange({ couponCode: v.value })}
        />
      ) : null}

      {requirements.needsDynamicUrl ? (
        <p className="text-xs text-muted-foreground">
          The link value is appended to the button&apos;s base URL — e.g. use the checkout
          &ldquo;Recovery Path&rdquo; or order &ldquo;Status Path&rdquo; field.
        </p>
      ) : null}
    </div>
  )
}
