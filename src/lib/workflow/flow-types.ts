/**
 * Persisted data contract of a Pinggo Webhooks V2 message flow
 * (`/webhook-message-flow-v2`). These shapes mirror exactly what the Pinggo
 * flow builder saves and what the production executor reads, so flows built
 * here stay executable — and editable — in the Pinggo dashboard.
 */

export type DelayUnit = "minutes" | "hours" | "days"

/** A template variable mapping: a payload path, or a static value when `isCustom`. */
export type TemplateVariableValue = {
  value: string
  isCustom?: boolean
  fallback?: string
}

export interface IWebhookFlowNode {
  id: string
  type: string
  position?: { x: number; y: number }
  data?: Record<string, unknown>
  deletable?: boolean
}

export interface IWebhookFlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  animated?: boolean
  style?: Record<string, unknown>
}

export interface IComputedVariable {
  id: string
  name: string
  type: "join" | "array-join" | "array-count"
  paths?: string[]
  separator?: string
  arrayPath?: string
  itemKey?: string
  description?: string
}

export interface IFlowContactSettings {
  businessId?: string
  phoneNumberId?: string
  senderPhoneNumber?: string
  /** Payload path holding the recipient phone number */
  contactPhoneNumber?: string
  customRecipientPhone?: string
  hasCountryCode?: boolean
  codeType?: "isd" | "iso"
  selectedCountry?: string
  /** Sample payload used by the flow builder for variable previews */
  webhookSample?: Record<string, unknown>
  computedVariables?: IComputedVariable[]
}

export interface IWebhookFlow {
  _id?: string
  vendorId: string
  workflowId: string
  name: string
  nodes: IWebhookFlowNode[]
  edges: IWebhookFlowEdge[]
  contactSettings?: IFlowContactSettings
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

/** React Flow node types registered by the Pinggo flow builder. */
export const FLOW_NODE_TYPES = {
  trigger: "triggerNode",
  delay: "delayNode",
  template: "followUpTemplateNode",
  condition: "conditionNode",
  restApi: "restApiNode",
  messageStatus: "messageStatusNode",
} as const

export const TRIGGER_NODE_ID = "trigger-node"
export const CONDITION_FALLBACK_HANDLE = "condition-fallback"
