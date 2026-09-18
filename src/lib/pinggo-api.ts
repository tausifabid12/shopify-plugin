/**
 * Thin API client for the Pinggo backend.
 *
 * A Shopify automation is a Pinggo "Advance Webhooks" (Webhooks V2) webhook,
 * provisioned by the server's `/shopify-app` module (see shopify-app-api.ts).
 * Its messages live in a Webhooks V2 message flow, saved through the same
 * production `/webhook-message-flow-v2` endpoints the Pinggo dashboard uses.
 *
 * The Pinggo JWT (stored as `pinggo_token`) is sent as a Bearer token; the
 * backend derives the user identity from it.
 */

import type { IWebhookFlow } from "@/lib/workflow/flow-types"

export const PINGGO_API_BASE =
    process.env.NEXT_PUBLIC_PINGGO_API_URL ?? "https://server.getcreator.online/api_v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IWhatsappTemplate {
    id: string;
    name: string;
    status: string;
    language: string;
    category: string;
    components: Array<Record<string, unknown>>;
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

export type FlowMessageStatus = "pending" | "sent" | "failed" | "skipped" | "delivered" | "read";

export interface IFlowExecution {
    _id: string;
    contactPhone: string;
    triggerMessageStatus: FlowMessageStatus;
    followUpLogs: {
        nodeId: string;
        order: number;
        templateName?: string;
        scheduledAt: string;
        sentAt?: string;
        status: FlowMessageStatus;
        errorMessage?: string;
    }[];
    isCompleted: boolean;
    createdAt: string;
}

type ApiEnvelope<T> = {
    success?: boolean;
    message?: string;
    error?: unknown;
    data?: T;
    meta?: unknown;
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

/** Performs an authenticated request and returns `data`, surfacing the server's error message. */
export async function pinggoRequest<T>(
    token: string,
    path: string,
    init: { method?: string; body?: unknown; fallbackError: string }
): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${PINGGO_API_BASE}${path}`, {
            method: init.method ?? "GET",
            headers: authHeaders(token),
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
            cache: "no-store",
        });
    } catch {
        throw new Error(`${init.fallbackError} Check your connection and try again.`);
    }
    const json = await readEnvelope<T>(res);
    if (!res.ok || json.success === false) {
        const detail = typeof json.error === "string" && !json.message ? json.error : json.message;
        throw new Error(detail || `${init.fallbackError} (${res.status})`);
    }
    return json.data as T;
}

// ─── WhatsApp templates ───────────────────────────────────────────────────────

export async function fetchWhatsappTemplates(
    token: string,
    userId: string
): Promise<IWhatsappTemplate[]> {
    const params = new URLSearchParams({ userId, page: "1", limit: "1000" });
    const raw = await pinggoRequest<Array<Record<string, unknown>>>(token, `/templates?${params}`, {
        fallbackError: "Failed to fetch templates.",
    });
    // The backend Templates model uses snake_case field names; normalize to the
    // same shape the dashboard uses.
    return (raw ?? []).map((t) => ({
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
    if (!res.ok) throw new Error(`Failed to load the saved automation (${res.status}).`);
    const json = await readEnvelope<IWebhookFlow>(res);
    return json.data ?? null;
}

export async function createWebhookFlow(token: string, payload: IWebhookFlow): Promise<IWebhookFlow> {
    return pinggoRequest<IWebhookFlow>(token, "/webhook-message-flow-v2", {
        method: "POST",
        body: payload,
        fallbackError: "Failed to save automation.",
    });
}

export async function updateWebhookFlow(
    token: string,
    flowId: string,
    payload: IWebhookFlow
): Promise<IWebhookFlow> {
    return pinggoRequest<IWebhookFlow>(token, `/webhook-message-flow-v2/${flowId}`, {
        method: "PUT",
        body: payload,
        fallbackError: "Failed to save automation.",
    });
}

// ─── Execution reports (webhook-flow-execution-report-v2) ────────────────────

export async function fetchFlowExecutions(
    token: string,
    workflowId: string,
    limit = 5
): Promise<IFlowExecution[]> {
    const params = new URLSearchParams({ webhookId: workflowId, page: "1", limit: String(limit) });
    const data = await pinggoRequest<IFlowExecution[]>(token, `/webhook-flow-execution-report-v2?${params}`, {
        fallbackError: "Failed to load recent activity.",
    });
    return data ?? [];
}
