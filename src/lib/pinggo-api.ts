/**
 * Thin API client for the Pinggo backend (webhooks-v2 feature).
 *
 * The Shopify plugin reuses Pinggo's production "Advance Webhooks" (webhooks-v2)
 * feature. A Shopify automation is represented as:
 *   - a webhooks-v2 webhook (name prefixed with `Shopify: `),
 *   - its backing workflow + trigger,
 *   - and a message flow (follow-up template nodes) that sends WhatsApp messages.
 *
 * The Pinggo JWT (stored as `pinggo_token`) is sent as a Bearer token; the
 * backend derives the user identity from it.
 */

export const PINGGO_API_BASE =
    process.env.NEXT_PUBLIC_PINGGO_API_URL ?? "https://server.getcreator.online/api_v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IVariableDefinition {
    path: string;
    label: string;
}

export interface IShopifyWebhook {
    _id: string;
    vendorUserId: string;
    folderId: string;
    name: string;
    status?: "draft" | "active";
    secret?: string;
    workflowId?: string;
    triggerId?: string;
    webhookUrl?: string;
    samplePayload?: unknown;
    createdAt?: string;
    updatedAt?: string;
}

export interface IWhatsappTemplate {
    id: string;
    name: string;
    status: string;
    language: string;
    category: string;
    components: Array<Record<string, unknown>>;
}

export interface IWorkflowFolder {
    _id: string;
    name: string;
    isDefault?: boolean;
    isDeletable?: boolean;
    isEditable?: boolean;
}

export interface IWhatsappPhoneNumber {
    name: string;
    verificationStatus: string;
    qualityRatting: string;
    phoneNumber: string;
    phoneNumberId: string;
    platformType: string;
}

export interface IWhatsappBusiness {
    businessId: string;
    businessName: string;
    phoneNumbers: IWhatsappPhoneNumber[];
}

export interface IVendorWhatsappDetails {
    vendorUserId: string;
    business: IWhatsappBusiness[];
}

export interface IWebhookFlowNode {
    id: string;
    type: string;
    position?: { x: number; y: number };
    data?: Record<string, unknown>;
    deletable?: boolean;
}

export interface IWebhookFlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    animated?: boolean;
    style?: Record<string, unknown>;
}

export interface IWebhookFlow {
    _id?: string;
    vendorId: string;
    workflowId: string;
    name: string;
    nodes: IWebhookFlowNode[];
    edges: IWebhookFlowEdge[];
    contactSettings?: Record<string, unknown>;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

type ApiEnvelope<T> = {
    success?: boolean;
    message?: string;
    error?: unknown;
    data?: T;
    meta?: unknown;
    webhook?: T;
    webhookUrl?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readEnvelope<T = unknown>(res: Response): Promise<ApiEnvelope<T>> {
    try {
        return (await res.json()) as ApiEnvelope<T>;
    } catch {
        return {};
    }
}

function authHeaders(token: string): Record<string, string> {
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

// ─── Webhooks (webhooks-v2) ───────────────────────────────────────────────────

export async function fetchWebhooks(token: string): Promise<IShopifyWebhook[]> {
    const res = await fetch(`${PINGGO_API_BASE}/webhooks-v2`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch webhooks: ${res.status}`);
    const json = await readEnvelope<IShopifyWebhook[]>(res);
    return json.data ?? [];
}

export async function createWebhook(
    token: string,
    input: { vendorUserId: string; folderId: string; name: string }
): Promise<IShopifyWebhook> {
    const res = await fetch(`${PINGGO_API_BASE}/webhooks-v2`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(input),
        cache: "no-store",
    });
    if (!res.ok) {
        const json = await readEnvelope(res);
        throw new Error(
            (typeof json.error === "string" ? json.error : json.message) ||
            `Failed to create webhook: ${res.status}`
        );
    }
    const json = await readEnvelope<IShopifyWebhook>(res);
    return (json.webhook ?? json.data ?? {}) as IShopifyWebhook;
}

export async function updateWebhookStatus(
    token: string,
    webhookId: string,
    status: "draft" | "active"
): Promise<IShopifyWebhook> {
    const res = await fetch(`${PINGGO_API_BASE}/webhooks-v2/${webhookId}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ status }),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to update webhook: ${res.status}`);
    const json = await readEnvelope<IShopifyWebhook>(res);
    return (json.data ?? {}) as IShopifyWebhook;
}

export async function deleteWebhook(token: string, webhookId: string): Promise<void> {
    const res = await fetch(`${PINGGO_API_BASE}/webhooks-v2/${webhookId}`, {
        method: "DELETE",
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to delete webhook: ${res.status}`);
}

// ─── Workflow folders ─────────────────────────────────────────────────────────

export async function fetchWorkflowFolders(token: string): Promise<IWorkflowFolder[]> {
    const res = await fetch(`${PINGGO_API_BASE}/workflows-v2/folders`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch folders: ${res.status}`);
    const json = await readEnvelope<IWorkflowFolder[]>(res);
    return json.data ?? [];
}

// ─── WhatsApp templates ───────────────────────────────────────────────────────

export async function fetchWhatsappTemplates(
    token: string,
    userId: string
): Promise<IWhatsappTemplate[]> {
    const params = new URLSearchParams({ userId, limit: "100" });
    const res = await fetch(`${PINGGO_API_BASE}/templates?${params}`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
    const json = await readEnvelope<Array<Record<string, unknown>>>(res);
    const raw = json.data ?? [];
    // The backend Templates model uses snake_case field names; normalize to the
    // same shape the dashboard uses so downstream consumers can rely on
    // `id`, `name`, `status`, `language`, `category`, `components`.
    return raw.map((t) => ({
        id: String(t.template_id ?? t.id ?? ""),
        name: String(t.template_name ?? t.name ?? ""),
        status: String(t.template_status ?? t.status ?? ""),
        language: String(t.template_language ?? t.language ?? ""),
        category: String(t.template_category ?? t.category ?? ""),
        components: (t.template_components ?? t.components ?? []) as Array<Record<string, unknown>>,
    }));
}

// ─── Vendor WhatsApp details (phone numbers / business) ───────────────────────

export async function fetchVendorWhatsappDetails(
    token: string,
    userId: string
): Promise<IVendorWhatsappDetails | null> {
    const res = await fetch(`${PINGGO_API_BASE}/vendor-details/${userId}`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await readEnvelope<IVendorWhatsappDetails>(res);
    return json.data ?? null;
}

// ─── Message flow (webhook-message-flow-v2) ───────────────────────────────────

export async function fetchWebhookFlow(
    token: string,
    workflowId: string
): Promise<IWebhookFlow | null> {
    const res = await fetch(`${PINGGO_API_BASE}/webhook-message-flow-v2/${workflowId}`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch flow: ${res.status}`);
    const json = await readEnvelope<IWebhookFlow>(res);
    return json.data ?? null;
}

export async function createWebhookFlow(
    token: string,
    payload: Partial<IWebhookFlow> & { vendorId: string }
): Promise<IWebhookFlow> {
    const res = await fetch(`${PINGGO_API_BASE}/webhook-message-flow-v2`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to create flow: ${res.status}`);
    const json = await readEnvelope<IWebhookFlow>(res);
    return (json.data ?? {}) as IWebhookFlow;
}

export async function updateWebhookFlow(
    token: string,
    flowId: string,
    payload: Partial<IWebhookFlow>
): Promise<IWebhookFlow> {
    const res = await fetch(`${PINGGO_API_BASE}/webhook-message-flow-v2/${flowId}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to update flow: ${res.status}`);
    const json = await readEnvelope<IWebhookFlow>(res);
    return (json.data ?? {}) as IWebhookFlow;
}
