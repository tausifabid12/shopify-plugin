import type { ConditionOperator } from "@/lib/workflow/condition-operators"
import type { DelayUnit, IComputedVariable, TemplateVariableValue } from "@/lib/workflow/flow-types"

/**
 * Editable, linear representation of a Webhooks V2 flow:
 *
 *   trigger → [conditions] → ([delay] → template)+
 *
 * It is converted to/from the persisted node graph by flow-builder / flow-parser.
 */

export type ConditionMatch = "all" | "any"

export type ConditionDraft = {
  /** Rule id — becomes the `condition-<id>` source handle */
  id: string
  /** Condition node id this rule was loaded from (kept stable across saves) */
  nodeId?: string
  variable: string
  operator: ConditionOperator
  value: string
}

export type MessageStep = {
  /** Template node id (kept stable so execution reports keep matching) */
  id: string
  delayNodeId?: string
  templateId: string
  templateName: string
  /** Full WhatsApp template object (with `components`), required by the executor */
  template?: Record<string, unknown>
  /** Wait before this message, relative to the previous step (0 = immediately) */
  delayAmount: number
  delayUnit: DelayUnit
  /** `field_N` → body variable */
  variables: Record<string, TemplateVariableValue>
  /** `header_N` → text header variable */
  headerVariables: Record<string, TemplateVariableValue>
  /** Header media URL (image / video / document templates) */
  fileUrl: string
  /** Dynamic URL button suffix — payload path or static text */
  dynamicUrlSuffix: string
  /** Copy-code button value — payload path or static text */
  couponCode: string
}

export type AutomationDraft = {
  conditionMatch: ConditionMatch
  conditions: ConditionDraft[]
  steps: MessageStep[]
  /** Payload path of the recipient phone */
  recipientPath: string
  businessId: string
  phoneNumberId: string
  senderPhoneNumber: string
  /** Transforms created in the Pinggo flow builder (preserved on save) */
  computedVariables: IComputedVariable[]
}

export const customUnitOptions: { value: DelayUnit; label: string }[] = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
]

export function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
}

export function emptyStep(): MessageStep {
  return {
    id: makeId("followup"),
    templateId: "",
    templateName: "",
    template: undefined,
    delayAmount: 0,
    delayUnit: "minutes",
    variables: {},
    headerVariables: {},
    fileUrl: "",
    dynamicUrlSuffix: "",
    couponCode: "",
  }
}

export function emptyCondition(): ConditionDraft {
  return { id: makeId("rule"), variable: "", operator: "equals", value: "" }
}

export function emptyDraft(defaultRecipientPath: string): AutomationDraft {
  return {
    conditionMatch: "all",
    conditions: [],
    steps: [emptyStep()],
    recipientPath: defaultRecipientPath,
    businessId: "",
    phoneNumberId: "",
    senderPhoneNumber: "",
    computedVariables: [],
  }
}
