import type { IWebhookFlow, IWebhookFlowNode, IWebhookFlowEdge } from "@/lib/pinggo-api";
import { analyzeTemplate } from "@/lib/template-analysis";

/**
 * Helpers for building/reading a webhooks-v2 message flow.
 *
 * A Shopify automation maps to a Pinggo "Advance Webhooks" (webhooks-v2) flow:
 *
 *   triggerNode ──▶ followUpTemplateNode(s)
 *
 * The trigger node captures the incoming Shopify webhook payload, and each
 * follow-up template node sends a WhatsApp message template (with variables
 * mapped to webhook JSON paths) after an optional delay.
 *
 * The `messageData` shape must match what Pinggo's `webhook-follow-up-flow-executor`
 * reads at send time:
 *   messageData.messageData.name            → template name
 *   messageData.messageData.language        → language code
 *   messageData.messageData.fullTemplateData→ full WhatsApp template object
 *   messageData.analyzedTemplate            → TemplateAnalysis (variable counts)
 *   messageData.variables                   → { field_N: { value, isCustom? } }
 */

export type DelayUnit = "minutes" | "hours" | "days";

export type TemplateVariableValue = {
  value: string; // JSON path or custom string
  isCustom?: boolean;
  fallback?: string;
};

export type MessageStep = {
  id: string;
  templateId: string;
  templateName: string;
  /** Full WhatsApp template object (with `components`), needed by the executor. */
  template?: Record<string, unknown>;
  /** Delay before sending this message (0 = immediately). */
  delayAmount: number;
  delayUnit: DelayUnit;
  /** template variable key (e.g. "field_1") → webhook path or custom value */
  variables: Record<string, TemplateVariableValue>;
};

export const customUnitOptions = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
] as const;

const TRIGGER_NODE_ID = "trigger-node";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyStep(): MessageStep {
  return {
    id: makeId("step"),
    templateId: "",
    templateName: "",
    template: undefined,
    delayAmount: 0,
    delayUnit: "minutes",
    variables: {},
  };
}

export function buildTriggerNode(): IWebhookFlowNode {
  return {
    id: TRIGGER_NODE_ID,
    type: "triggerNode",
    position: { x: 80, y: 200 },
    data: {
      nodeType: "trigger",
      status: "pending",
      messageData: undefined,
    },
    deletable: false,
  };
}

export function buildTemplateNode(
  step: MessageStep,
  index: number
): IWebhookFlowNode {
  const template = step.template as
    | { name?: string; language?: string; components?: Array<Record<string, unknown>>; category?: string }
    | undefined;

  const data: Record<string, unknown> = {
    nodeType: "follow-up-template",
    label: `Message ${index + 1}`,
    order: index + 1,
    status: "pending",
    scheduledSendTime: null,
    buttons: [],
    flowFormRequired: false,
    messageData: step.templateId
      ? {
          messageData: {
            name: step.templateName || template?.name,
            language: template?.language,
            fullTemplateData: template,
          },
          analyzedTemplate: template ? analyzeTemplate(template) : undefined,
          variables: step.variables,
        }
      : undefined,
  };

  return {
    id: step.id,
    type: "followUpTemplateNode",
    position: { x: 320 + index * 300, y: 200 },
    data,
    deletable: true,
  };
}

export type ContactSettings = {
  /** WhatsApp business id */
  businessId?: string;
  /** WhatsApp phone-number id used to send messages */
  phoneNumberId?: string;
  /** Sender phone number (human-readable) */
  senderPhoneNumber?: string;
  /** JSON path in the webhook payload holding the recipient phone number */
  contactPhoneNumber?: string;
  /** Whether the recipient phone already includes a country code */
  hasCountryCode?: boolean;
  codeType?: "isd" | "iso";
  selectedCountry?: string;
  /** Fixed recipient phone (overrides contactPhoneNumber) */
  customRecipientPhone?: string;
  /** Sample payload used for variable resolution */
  webhookSample?: Record<string, unknown>;
};

export function buildFlowFromSteps({
  vendorId,
  workflowId,
  name,
  steps,
  contactSettings,
}: {
  vendorId: string;
  workflowId: string;
  name: string;
  steps: MessageStep[];
  contactSettings?: ContactSettings;
}): IWebhookFlow {
  const nodes: IWebhookFlowNode[] = [buildTriggerNode()];
  const edges: IWebhookFlowEdge[] = [];

  let previousNodeId = TRIGGER_NODE_ID;

  steps.forEach((step, index) => {
    // A delay node is inserted only for follow-ups after the first message.
    if (index > 0 && step.delayAmount > 0) {
      const delayId = makeId("delay");
      nodes.push({
        id: delayId,
        type: "delayNode",
        position: { x: 320 + index * 300 - 150, y: 200 },
        data: {
          nodeType: "delay",
          delayAmount: step.delayAmount,
          delayUnit: step.delayUnit,
        },
      });
      edges.push({
        id: makeId("edge"),
        source: previousNodeId,
        target: delayId,
        sourceHandle: null,
        targetHandle: null,
        type: "followUpEdge",
        animated: true,
      });
      previousNodeId = delayId;
    }

    nodes.push(buildTemplateNode(step, index));
    edges.push({
      id: makeId("edge"),
      source: previousNodeId,
      target: step.id,
      sourceHandle: null,
      targetHandle: null,
      type: "followUpEdge",
      animated: true,
    });
    previousNodeId = step.id;
  });

  return {
    vendorId,
    workflowId,
    name,
    nodes,
    edges,
    ...(contactSettings ? { contactSettings } : {}),
  };
}

export function stepsFromFlow(flow: IWebhookFlow): MessageStep[] {
  const steps: MessageStep[] = [];

  let pendingDelayAmount = 0;
  let pendingDelayUnit: DelayUnit = "minutes";

  for (const node of flow.nodes ?? []) {
    if (node.type === "delayNode") {
      const data = (node.data ?? {}) as {
        delayAmount?: number;
        delayUnit?: DelayUnit;
      };
      pendingDelayAmount = data.delayAmount ?? 0;
      pendingDelayUnit = data.delayUnit ?? "minutes";
      continue;
    }
    if (node.type !== "followUpTemplateNode") continue;

    const data = (node.data ?? {}) as {
      messageData?: {
        messageData?: { name?: string; language?: string; fullTemplateData?: Record<string, unknown> };
        variables?: Record<string, TemplateVariableValue>;
      };
    };
    const template = data.messageData?.messageData?.fullTemplateData;
    const templateName = data.messageData?.messageData?.name ?? "";
    const templateId = (template as { id?: unknown } | undefined)?.id ?? "";

    steps.push({
      id: node.id,
      templateId: typeof templateId === "string" ? templateId : "",
      templateName,
      template,
      delayAmount: pendingDelayAmount,
      delayUnit: pendingDelayUnit,
      variables: data.messageData?.variables ?? {},
    });

    pendingDelayAmount = 0;
    pendingDelayUnit = "minutes";
  }

  return steps;
}
