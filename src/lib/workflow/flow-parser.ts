import type { AutomationDraft, ConditionDraft, MessageStep } from "@/lib/workflow/automation-draft"
import { emptyDraft } from "@/lib/workflow/automation-draft"
import { isSupportedOperator } from "@/lib/workflow/condition-operators"
import {
  CONDITION_FALLBACK_HANDLE,
  FLOW_NODE_TYPES,
  type DelayUnit,
  type IWebhookFlow,
  type IWebhookFlowEdge,
  type IWebhookFlowNode,
  type TemplateVariableValue,
} from "@/lib/workflow/flow-types"

/**
 * Reads a persisted Webhooks V2 flow back into a linear automation draft.
 *
 * Flows edited in the Pinggo flow builder can contain branches or nodes this
 * editor cannot represent (REST API calls, message-status or button branches,
 * fallbacks, carousels…). Those are reported as unsupported so the caller can
 * block saving instead of silently discarding the merchant's work.
 */

export type ParseResult =
  | { supported: true; draft: AutomationDraft }
  | { supported: false; reason: string }

type AnyRecord = Record<string, unknown>

const unsupported = (reason: string): ParseResult => ({ supported: false, reason })

const asRecord = (value: unknown): AnyRecord =>
  typeof value === "object" && value !== null ? (value as AnyRecord) : {}

function readVariables(value: unknown): Record<string, TemplateVariableValue> {
  const out: Record<string, TemplateVariableValue> = {}
  for (const [key, raw] of Object.entries(asRecord(value))) {
    if (typeof raw === "string") out[key] = { value: raw }
    else {
      const v = asRecord(raw)
      out[key] = {
        value: String(v.value ?? ""),
        ...(v.isCustom ? { isCustom: true } : {}),
        ...(typeof v.fallback === "string" ? { fallback: v.fallback } : {}),
      }
    }
  }
  return out
}

function readStep(node: IWebhookFlowNode, delay?: IWebhookFlowNode): MessageStep | string {
  const data = asRecord(node.data)
  const messageData = asRecord(data.messageData)
  const meta = asRecord(messageData.messageData)
  const template = meta.fullTemplateData as AnyRecord | undefined
  const override = asRecord(messageData.recipientOverride)

  if (messageData.isCarousel) return "a carousel template"
  if (messageData.flowTokens || data.flowFormRequired) return "a WhatsApp Flow form"
  if (override.mode && override.mode !== "default") return "a per-message recipient override"

  const delayData = asRecord(delay?.data)
  return {
    id: node.id,
    delayNodeId: delay?.id,
    templateId: String(template?.id ?? ""),
    templateName: String(meta.name ?? ""),
    template,
    delayAmount: Number(delayData.delayAmount ?? 0) || 0,
    delayUnit: (delayData.delayUnit as DelayUnit) ?? "minutes",
    variables: readVariables(messageData.variables),
    headerVariables: readVariables(messageData.headerVariables),
    fileUrl: String(messageData.fileUrl ?? ""),
    dynamicUrlSuffix: String(messageData.dynamicUrlSuffix ?? ""),
    couponCode: String(messageData.couponCode ?? ""),
  }
}

function readRules(node: IWebhookFlowNode): ConditionDraft[] | string {
  const data = asRecord(node.data)
  if (Array.isArray(data.conditionGroups) && data.conditionGroups.length > 0) return "grouped conditions"
  const rules = Array.isArray(data.rules) ? data.rules.map(asRecord) : []
  if (rules.length === 0) return "an empty condition"
  const drafts: ConditionDraft[] = []
  for (const rule of rules) {
    const operator = String(rule.operator ?? "")
    if (!isSupportedOperator(operator)) return `the "${operator}" condition operator`
    drafts.push({
      id: String(rule.id ?? ""),
      nodeId: node.id,
      variable: String(rule.variableName ?? rule.field ?? ""),
      operator,
      value: String(rule.value ?? ""),
    })
  }
  return drafts
}

export function parseFlowToDraft(flow: IWebhookFlow | null, defaultRecipientPath: string): ParseResult {
  const draft = emptyDraft(defaultRecipientPath)
  if (!flow) return { supported: true, draft }

  const settings = flow.contactSettings ?? {}
  draft.recipientPath = settings.contactPhoneNumber || defaultRecipientPath
  draft.businessId = settings.businessId ?? ""
  draft.phoneNumberId = settings.phoneNumberId ?? ""
  draft.senderPhoneNumber = settings.senderPhoneNumber ?? ""
  draft.computedVariables = settings.computedVariables ?? []
  if (settings.customRecipientPhone) return unsupported("It sends to a fixed phone number.")

  const nodes = new Map((flow.nodes ?? []).map((n) => [n.id, n]))
  const outgoing = new Map<string, IWebhookFlowEdge[]>()
  for (const e of flow.edges ?? []) {
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e])
  }

  const trigger = (flow.nodes ?? []).find((n) => n.type === FLOW_NODE_TYPES.trigger)
  if (!trigger) return { supported: true, draft }
  if (asRecord(trigger.data).messageData) return unsupported("It sends a message from the trigger node.")

  const visited = new Set<string>([trigger.id])
  const steps: MessageStep[] = []
  const conditions: ConditionDraft[] = []
  let conditionNodes = 0
  let pendingDelay: IWebhookFlowNode | undefined
  let current = trigger

  for (let guard = 0; guard < 100; guard++) {
    const edges = outgoing.get(current.id) ?? []
    if (edges.length === 0) break

    let nextId: string
    if (current.type === FLOW_NODE_TYPES.condition) {
      if (edges.some((e) => e.sourceHandle === CONDITION_FALLBACK_HANDLE || !e.sourceHandle?.startsWith("condition-"))) {
        return unsupported("It has a condition fallback branch.")
      }
      const targets = new Set(edges.map((e) => e.target))
      if (targets.size !== 1) return unsupported("Its conditions lead to different branches.")
      nextId = edges[0].target
    } else {
      if (edges.length !== 1 || edges[0].sourceHandle) return unsupported("It has branching paths (buttons or statuses).")
      nextId = edges[0].target
    }

    const next = nodes.get(nextId)
    if (!next || visited.has(nextId)) return unsupported("It contains a loop or a broken connection.")
    visited.add(nextId)

    switch (next.type) {
      case FLOW_NODE_TYPES.condition: {
        if (steps.length > 0 || pendingDelay) return unsupported("It checks conditions between messages.")
        const rules = readRules(next)
        if (typeof rules === "string") return unsupported(`It uses ${rules}.`)
        conditionNodes++
        conditions.push(...rules)
        break
      }
      case FLOW_NODE_TYPES.delay:
        if (pendingDelay) return unsupported("It has consecutive delays.")
        pendingDelay = next
        break
      case FLOW_NODE_TYPES.template: {
        const step = readStep(next, pendingDelay)
        if (typeof step === "string") return unsupported(`It uses ${step}.`)
        steps.push(step)
        pendingDelay = undefined
        break
      }
      default:
        return unsupported("It uses steps only available in the Pinggo flow builder (e.g. REST API or message status).")
    }
    current = next
  }

  if (pendingDelay) return unsupported("It ends with a delay.")
  if (visited.size !== nodes.size) return unsupported("It contains steps that are not connected to the flow.")

  // Multiple rules on a single node = "any"; a chain of single-rule nodes = "all".
  draft.conditionMatch = conditionNodes === 1 && conditions.length > 1 ? "any" : "all"
  if (conditionNodes > 1 && conditions.length !== conditionNodes) {
    return unsupported("It mixes 'any' and 'all' conditions.")
  }
  draft.conditions = conditions
  if (steps.length > 0) draft.steps = steps
  return { supported: true, draft }
}
