import type { AutomationDraft, ConditionDraft, MessageStep } from "@/lib/workflow/automation-draft"
import { makeId } from "@/lib/workflow/automation-draft"
import { operatorNeedsValue } from "@/lib/workflow/condition-operators"
import {
  FLOW_NODE_TYPES,
  TRIGGER_NODE_ID,
  type IWebhookFlow,
  type IWebhookFlowEdge,
  type IWebhookFlowNode,
  type TemplateVariableValue,
} from "@/lib/workflow/flow-types"
import { analyzeTemplate } from "@/lib/workflow/template-analysis"
import { getTemplateRequirements, quickReplyButtons } from "@/lib/workflow/template-requirements"

/**
 * Builds a Webhooks V2 flow graph from a linear automation draft, producing the
 * same node/edge data the Pinggo flow builder saves:
 *
 *   triggerNode → conditionNode(s) → [delayNode] → followUpTemplateNode → …
 *
 * - "all" conditions: one condition node per rule, chained; a failed rule has no
 *   fallback edge, so the flow stops.
 * - "any" conditions: one condition node; every rule handle points to the next node.
 * - Delays accumulate along the chain in the executor, so each delay is relative
 *   to the previous message.
 */

const X_STEP = 300
const Y = 200
const EDGE_STYLE = { stroke: "#22c55e", strokeWidth: 2 }

function edge(source: string, target: string, sourceHandle: string | null = null): IWebhookFlowEdge {
  return {
    id: makeId("edge"),
    source,
    target,
    sourceHandle,
    targetHandle: null,
    type: "followUpEdge",
    animated: true,
    style: EDGE_STYLE,
  }
}

/** Serializes a mapping like the flow builder: `{ value, isCustom: true }` or `{ value, fallback? }`. */
function serializeVariable(v: TemplateVariableValue | undefined): TemplateVariableValue {
  if (!v) return { value: "" }
  if (v.isCustom) return { value: v.value, isCustom: true }
  const fallback = v.fallback?.trim()
  return fallback ? { value: v.value, fallback } : { value: v.value }
}

/** The executor sends `Object.values(variables)` in insertion order — keys must be ordered. */
function orderedVariables(keys: string[], source: Record<string, TemplateVariableValue>) {
  return Object.fromEntries(keys.map((key) => [key, serializeVariable(source[key])]))
}

function conditionRule(rule: ConditionDraft) {
  return {
    id: rule.id,
    variableName: rule.variable,
    operator: rule.operator,
    value: operatorNeedsValue(rule.operator) ? rule.value : "",
    label: "",
  }
}

function templateNodeData(step: MessageStep, index: number) {
  const template = step.template as { name?: string; language?: string } | undefined
  const requirements = getTemplateRequirements(step.template)
  return {
    nodeType: "follow-up-template",
    label: `Message ${index + 1}`,
    order: index + 1,
    status: "pending",
    messageData: step.template
      ? {
          messageData: {
            name: step.templateName || template?.name,
            language: template?.language,
            fullTemplateData: step.template,
          },
          analyzedTemplate: analyzeTemplate(step.template as Parameters<typeof analyzeTemplate>[0]),
          variables: orderedVariables(requirements?.bodyKeys ?? [], step.variables),
          headerVariables: orderedVariables(requirements?.headerKeys ?? [], step.headerVariables),
          dynamicUrlSuffix: requirements?.needsDynamicUrl ? step.dynamicUrlSuffix : undefined,
          couponCode: requirements?.needsCouponCode ? step.couponCode : undefined,
          fileUrl: requirements?.needsHeaderMedia ? step.fileUrl : undefined,
          recipientOverride: { mode: "default" },
        }
      : undefined,
    buttons: quickReplyButtons(step.template),
    flowFormRequired: false,
  }
}

export function buildFlowFromDraft(opts: {
  vendorId: string
  workflowId: string
  name: string
  draft: AutomationDraft
  webhookSample?: Record<string, unknown>
}): IWebhookFlow {
  const { vendorId, workflowId, name, draft, webhookSample } = opts
  let x = 80
  const nodes: IWebhookFlowNode[] = [
    {
      id: TRIGGER_NODE_ID,
      type: FLOW_NODE_TYPES.trigger,
      position: { x, y: Y },
      data: { nodeType: "trigger", workflowId, status: "pending", messageData: undefined },
      deletable: false,
    },
  ]
  const edges: IWebhookFlowEdge[] = []

  // Each entry: the node(s)/handles that must connect to whatever comes next.
  let pending: { source: string; handle: string | null }[] = [{ source: TRIGGER_NODE_ID, handle: null }]
  const connectTo = (target: string) => {
    pending.forEach((p) => edges.push(edge(p.source, target, p.handle)))
  }

  const rules = draft.conditions
  if (rules.length > 0 && draft.conditionMatch === "any") {
    const nodeId = rules[0].nodeId ?? makeId("condition")
    nodes.push({
      id: nodeId,
      type: FLOW_NODE_TYPES.condition,
      position: { x: (x += X_STEP), y: Y },
      data: { nodeType: "condition", label: "Only continue when any condition matches", rules: rules.map(conditionRule) },
    })
    connectTo(nodeId)
    pending = rules.map((r) => ({ source: nodeId, handle: `condition-${r.id}` }))
  } else {
    const usedNodeIds = new Set<string>()
    for (const rule of rules) {
      const nodeId = rule.nodeId && !usedNodeIds.has(rule.nodeId) ? rule.nodeId : makeId("condition")
      usedNodeIds.add(nodeId)
      nodes.push({
        id: nodeId,
        type: FLOW_NODE_TYPES.condition,
        position: { x: (x += X_STEP), y: Y },
        data: { nodeType: "condition", label: "Condition", rules: [conditionRule(rule)] },
      })
      connectTo(nodeId)
      pending = [{ source: nodeId, handle: `condition-${rule.id}` }]
    }
  }

  draft.steps.forEach((step, index) => {
    if (step.delayAmount > 0) {
      const delayId = step.delayNodeId ?? makeId("delay")
      nodes.push({
        id: delayId,
        type: FLOW_NODE_TYPES.delay,
        position: { x: (x += X_STEP), y: Y },
        data: { nodeType: "delay", delayAmount: step.delayAmount, delayUnit: step.delayUnit },
      })
      connectTo(delayId)
      pending = [{ source: delayId, handle: null }]
    }

    nodes.push({
      id: step.id,
      type: FLOW_NODE_TYPES.template,
      position: { x: (x += X_STEP), y: Y },
      data: templateNodeData(step, index),
    })
    connectTo(step.id)
    pending = [{ source: step.id, handle: null }]
  })

  return {
    vendorId,
    workflowId,
    name,
    nodes,
    edges,
    contactSettings: {
      businessId: draft.businessId,
      phoneNumberId: draft.phoneNumberId,
      senderPhoneNumber: draft.senderPhoneNumber,
      contactPhoneNumber: draft.recipientPath,
      customRecipientPhone: "",
      // Shopify phones are normalized to E.164 server-side.
      hasCountryCode: true,
      codeType: "isd",
      selectedCountry: "",
      webhookSample,
      computedVariables: draft.computedVariables,
    },
  }
}
