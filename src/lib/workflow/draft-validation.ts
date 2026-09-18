import type { AutomationDraft } from "@/lib/workflow/automation-draft"
import { operatorNeedsValue } from "@/lib/workflow/condition-operators"
import type { TemplateVariableValue } from "@/lib/workflow/flow-types"
import { getTemplateRequirements } from "@/lib/workflow/template-requirements"

/**
 * Pre-save checks. The executor drops empty body/header variables (shifting the
 * remaining ones) and fails sends with missing media/button values, so every
 * required input must be filled before a flow is saved.
 */

const isFilled = (v: TemplateVariableValue | undefined) =>
  Boolean(v && (v.value.trim() || (!v.isCustom && v.fallback?.trim())))

export function validateDraft(draft: AutomationDraft): string | null {
  if (!draft.businessId || !draft.phoneNumberId) {
    return "Choose the WhatsApp number to send from. Connect one in PingGo first if the list is empty."
  }
  if (!draft.recipientPath.trim()) return "Choose the field that holds the customer's phone number."

  for (const [i, rule] of draft.conditions.entries()) {
    if (!rule.variable.trim()) return `Condition ${i + 1}: choose a field to check.`
    if (operatorNeedsValue(rule.operator) && !rule.value.trim()) return `Condition ${i + 1}: enter a value to compare with.`
  }

  if (draft.steps.length === 0) return "Add at least one message."

  for (const [i, step] of draft.steps.entries()) {
    const label = `Message ${i + 1}`
    const requirements = getTemplateRequirements(step.template)
    if (!step.templateId || !requirements) return `${label}: select a WhatsApp template.`
    if (!requirements.supported) return `${label}: this template type can only be configured in the PingGo flow builder.`
    if (step.delayAmount < 0) return `${label}: the delay cannot be negative.`
    if (requirements.headerKeys.some((k) => !isFilled(step.headerVariables[k]))) return `${label}: map every header variable.`
    if (requirements.bodyKeys.some((k) => !isFilled(step.variables[k]))) return `${label}: map every message variable.`
    if (requirements.needsHeaderMedia && !/^https:\/\//i.test(step.fileUrl.trim())) return `${label}: add an https:// media URL for the template header.`
    if (requirements.needsDynamicUrl && !step.dynamicUrlSuffix.trim()) return `${label}: set the button link value.`
    if (requirements.needsCouponCode && !step.couponCode.trim()) return `${label}: set the coupon code.`
  }
  return null
}
