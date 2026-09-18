/**
 * Client for the Pinggo server's `/shopify-app` module, which turns Shopify
 * events into Webhooks V2 automations: it registers Shopify webhooks, verifies
 * and de-duplicates deliveries, normalizes payloads and runs the flows.
 */

import { pinggoRequest } from "@/lib/pinggo-api"

export interface ITriggerVariable {
  path: string
  label: string
  group: string
}

/** An admin-enabled Shopify event, with the variables a flow can use. */
export interface IShopifyTrigger {
  topic: string
  name: string
  description: string
  resource: string
  variables: ITriggerVariable[]
  sample: Record<string, unknown>
}

export type AutomationStatus = "active" | "draft" | "missing"

export interface IShopifyAutomation {
  featureKey: string
  shopifyTopic: string
  name: string
  status: AutomationStatus
  webhookId: string
  workflowId: string
  triggerId: string
  lastTriggeredAt: string | null
  lastRunStatus: "started" | "failed" | "skipped" | null
  lastError: string | null
}

export interface IShopifyStore {
  shopDomain: string
  shopName: string
  status: "active" | "uninstalled"
  lastWebhookAt?: string
}

export function fetchShopifyTriggers(token: string) {
  return pinggoRequest<IShopifyTrigger[]>(token, "/shopify-app/triggers", {
    fallbackError: "Failed to load Shopify events.",
  })
}

export function fetchShopifyAutomations(token: string) {
  return pinggoRequest<IShopifyAutomation[]>(token, "/shopify-app/automations", {
    fallbackError: "Failed to load automations.",
  })
}

export function fetchShopifyStore(token: string) {
  return pinggoRequest<IShopifyStore | null>(token, "/shopify-app/stores/me", {
    fallbackError: "Failed to load the connected store.",
  })
}

export function setShopifyAutomationStatus(
  token: string,
  featureKey: string,
  body: { enabled: boolean; shopifyTopic?: string; name?: string }
) {
  return pinggoRequest<IShopifyAutomation>(token, `/shopify-app/automations/${encodeURIComponent(featureKey)}/status`, {
    method: "PUT",
    body,
    fallbackError: body.enabled ? "Failed to enable automation." : "Failed to pause automation.",
  })
}
