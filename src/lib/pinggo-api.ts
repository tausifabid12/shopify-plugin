/**
 * Thin API client for the Pinggo backend.
 * Reads credentials from cookies via server actions or from client-side context.
 */

export const PINGGO_API_BASE =
    process.env.NEXT_PUBLIC_PINGGO_API_URL ?? "https://api.pinggo.app/api/v1";

export interface IVariableDefinition {
    path: string;
    label: string;
}

export interface IShopifyWebhookDefinition {
    _id: string;
    name: string;
    shopifyTopic: string;
    description?: string;
    examplePayload?: Record<string, any>;
    variables: IVariableDefinition[];
    enabled: boolean;
}

export interface IShopifyNotificationConfig {
    _id?: string;
    vendorUserId: string;
    webhookDefinitionId: string;
    shopifyTopic: string;
    enabled: boolean;
    messageTemplate: string;
    phoneNumberId?: string;
}

/** Fetch all enabled Shopify webhook definitions from the backend */
export async function fetchEnabledDefinitions(
    apiKey: string,
    userId: string
): Promise<IShopifyWebhookDefinition[]> {
    const res = await fetch(`${PINGGO_API_BASE}/shopify-webhook-definitions/enabled`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "x-user-id": userId,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch definitions: ${res.status}`);
    const json = await res.json();
    return json.data ?? [];
}

/** Fetch all notification configs for the vendor */
export async function fetchNotificationConfigs(
    apiKey: string,
    userId: string
): Promise<IShopifyNotificationConfig[]> {
    const res = await fetch(`${PINGGO_API_BASE}/shopify-notifications`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "x-user-id": userId,
        },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
    const json = await res.json();
    return json.data ?? [];
}

/** Upsert a notification config */
export async function saveNotificationConfig(
    apiKey: string,
    config: Omit<IShopifyNotificationConfig, "_id" | "vendorUserId">
): Promise<IShopifyNotificationConfig> {
    const res = await fetch(`${PINGGO_API_BASE}/shopify-notifications`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to save notification: ${res.status}`);
    const json = await res.json();
    return json.data;
}
