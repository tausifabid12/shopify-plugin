import "server-only"

import { pinggoRequest } from "@/lib/pinggo-api"
import { getPinggoCredentials } from "@/lib/pinggo"

import type {
  AbandonedRow,
  AnalyticsPreset,
  AnalyticsResult,
  AttemptRow,
  CheckoutConfigPayload,
  CheckoutConfigState,
  CheckoutOverview,
  CredentialSummary,
  CustomerDetail,
  CustomerRow,
  Offer,
  OfferInput,
  OrderRow,
  Paged,
  PaymentEnvironment,
  PaymentProviderKey,
  RefundRow,
  RouteRule,
  SessionDetail,
  SessionRow,
  TransactionDetail,
  TransactionRow,
} from "./types"

/**
 * Merchant dashboard client for the checkout API.
 *
 * `server-only` is load-bearing: every call here carries the PingGo JWT, and
 * importing this into a client component would put that token in the RSC
 * payload. Mutations are exposed to the UI through server actions instead, so
 * the token never leaves the server.
 */

async function token(): Promise<string> {
  const { apiKey } = await getPinggoCredentials()
  if (!apiKey) throw new Error("Your session has expired. Please sign in again.")
  return apiKey
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function fetchOverview(): Promise<CheckoutOverview> {
  return pinggoRequest<CheckoutOverview>(await token(), "/checkout/overview", {
    fallbackError: "Failed to load checkout settings.",
  })
}

export async function fetchConfig(): Promise<CheckoutConfigState> {
  return pinggoRequest<CheckoutConfigState>(await token(), "/checkout/config", {
    fallbackError: "Failed to load your checkout design.",
  })
}

export async function fetchCredentials(): Promise<CredentialSummary[]> {
  return pinggoRequest<CredentialSummary[]>(await token(), "/checkout/credentials", {
    fallbackError: "Failed to load payment gateways.",
  })
}

export async function fetchRouting(
  environment?: PaymentEnvironment
): Promise<{ environment: PaymentEnvironment; rules: RouteRule[] }> {
  const query = environment ? `?environment=${environment}` : ""
  return pinggoRequest(await token(), `/checkout/routing${query}`, {
    fallbackError: "Failed to load payment routing.",
  })
}

// ─── Lists & detail ───────────────────────────────────────────────────────────

export interface ListParams {
  page?: number
  limit?: number
  status?: string
  environment?: PaymentEnvironment
  search?: string
  from?: string
  to?: string
}

function query(params: ListParams = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

export async function fetchSessions(params?: ListParams): Promise<Paged<SessionRow>> {
  return pinggoRequest(await token(), `/checkout/sessions${query(params)}`, {
    fallbackError: "Failed to load checkout sessions.",
  })
}

export async function fetchSession(id: string): Promise<SessionDetail> {
  return pinggoRequest(await token(), `/checkout/sessions/${id}`, {
    fallbackError: "Failed to load this checkout.",
  })
}

export async function fetchAbandoned(
  params?: ListParams
): Promise<Paged<AbandonedRow>> {
  return pinggoRequest(await token(), `/checkout/abandoned${query(params)}`, {
    fallbackError: "Failed to load abandoned checkouts.",
  })
}

export async function fetchTransactions(
  params?: ListParams
): Promise<Paged<TransactionRow>> {
  return pinggoRequest(await token(), `/checkout/transactions${query(params)}`, {
    fallbackError: "Failed to load transactions.",
  })
}

export async function fetchTransaction(id: string): Promise<TransactionDetail> {
  return pinggoRequest(await token(), `/checkout/transactions/${id}`, {
    fallbackError: "Failed to load this transaction.",
  })
}

export async function fetchAttempts(params?: ListParams): Promise<Paged<AttemptRow>> {
  return pinggoRequest(await token(), `/checkout/attempts${query(params)}`, {
    fallbackError: "Failed to load payment attempts.",
  })
}

export async function fetchOrders(params?: ListParams): Promise<Paged<OrderRow>> {
  return pinggoRequest(await token(), `/checkout/orders${query(params)}`, {
    fallbackError: "Failed to load orders.",
  })
}

export async function fetchRefunds(params?: ListParams): Promise<Paged<RefundRow>> {
  return pinggoRequest(await token(), `/checkout/refunds${query(params)}`, {
    fallbackError: "Failed to load refunds.",
  })
}

export async function fetchAnalytics(params: {
  preset?: AnalyticsPreset
  from?: string
  to?: string
  environment?: PaymentEnvironment
}): Promise<AnalyticsResult> {
  return pinggoRequest(await token(), `/checkout/analytics${query(params)}`, {
    fallbackError: "Failed to load analytics.",
  })
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function saveConfigDraft(
  patch: Partial<CheckoutConfigPayload>
): Promise<{ draft: CheckoutConfigPayload }> {
  return pinggoRequest(await token(), "/checkout/config", {
    method: "PUT",
    body: patch,
    fallbackError: "Failed to save your changes.",
  })
}

export async function publishConfig(): Promise<{
  version: number
  publishedAt: string
}> {
  return pinggoRequest(await token(), "/checkout/config/publish", {
    method: "POST",
    fallbackError: "Failed to publish your checkout.",
  })
}

export async function discardConfigDraft(): Promise<{ draft: CheckoutConfigPayload }> {
  return pinggoRequest(await token(), "/checkout/config/discard", {
    method: "POST",
    fallbackError: "Failed to discard your draft.",
  })
}

export async function setCheckoutEnabled(
  enabled: boolean
): Promise<{ enabled: boolean }> {
  return pinggoRequest(await token(), "/checkout/enabled", {
    method: "PUT",
    body: { enabled },
    fallbackError: "Failed to update your checkout.",
  })
}

export async function setEnvironment(
  environment: PaymentEnvironment,
  confirmed?: boolean
): Promise<{ environment: PaymentEnvironment }> {
  return pinggoRequest(await token(), "/checkout/environment", {
    method: "PUT",
    body: { environment, confirmed },
    fallbackError: "Failed to switch payment mode.",
  })
}

export async function saveCredential(
  provider: PaymentProviderKey,
  body: {
    environment: PaymentEnvironment
    publicKey: string
    secret?: string
    webhookSecret?: string
    clientVersion?: string
    webhookUsername?: string
    webhookPassword?: string
    enabled?: boolean
  }
): Promise<{ verification: { ok: boolean; error?: string } }> {
  return pinggoRequest(await token(), `/checkout/credentials/${provider}`, {
    method: "PUT",
    body,
    fallbackError: "Failed to save the gateway credentials.",
  })
}

export async function saveRouting(
  environment: PaymentEnvironment,
  rules: RouteRule[]
): Promise<{ rules: RouteRule[] }> {
  return pinggoRequest(await token(), "/checkout/routing", {
    method: "PUT",
    body: { environment, rules },
    fallbackError: "Failed to save payment routing.",
  })
}

export async function deleteCredential(
  provider: PaymentProviderKey,
  environment: PaymentEnvironment
): Promise<null> {
  return pinggoRequest(
    await token(),
    `/checkout/credentials/${provider}?environment=${environment}`,
    { method: "DELETE", fallbackError: "Failed to disconnect the gateway." }
  )
}

export async function toggleCredential(
  provider: PaymentProviderKey,
  environment: PaymentEnvironment,
  enabled: boolean
): Promise<{ enabled: boolean }> {
  return pinggoRequest(
    await token(),
    `/checkout/credentials/${provider}/enabled?environment=${environment}`,
    { method: "PUT", body: { enabled }, fallbackError: "Failed to update the gateway." }
  )
}

export async function verifyCredential(
  provider: PaymentProviderKey,
  environment: PaymentEnvironment
): Promise<{ ok: boolean; error?: string }> {
  return pinggoRequest(
    await token(),
    `/checkout/credentials/${provider}/verify?environment=${environment}`,
    { method: "POST", fallbackError: "Failed to verify the credentials." }
  )
}

export async function createRefund(body: {
  transactionId: string
  amount?: number
  reason?: string
  notes?: string
}): Promise<RefundRow> {
  return pinggoRequest(await token(), "/checkout/refunds", {
    method: "POST",
    body,
    fallbackError: "Failed to submit the refund.",
  })
}

// ─── Customers (§25) ──────────────────────────────────────────────────────────

export async function fetchCustomers(
  params?: ListParams
): Promise<Paged<CustomerRow>> {
  return pinggoRequest(await token(), `/checkout/customers${query(params)}`, {
    fallbackError: "Failed to load customers.",
  })
}

export async function fetchCustomer(id: string): Promise<CustomerDetail> {
  return pinggoRequest(await token(), `/checkout/customers/${id}`, {
    fallbackError: "Failed to load this customer.",
  })
}

// ─── Offers (§24) ─────────────────────────────────────────────────────────────

export async function fetchOffers(
  environment?: PaymentEnvironment
): Promise<Offer[]> {
  const qs = environment ? `?environment=${environment}` : ""
  return pinggoRequest(await token(), `/checkout/offers${qs}`, {
    fallbackError: "Failed to load offers.",
  })
}

export async function createOffer(body: OfferInput): Promise<Offer> {
  return pinggoRequest(await token(), "/checkout/offers", {
    method: "POST",
    body,
    fallbackError: "Failed to create the offer.",
  })
}

export async function updateOffer(id: string, body: OfferInput): Promise<Offer> {
  return pinggoRequest(await token(), `/checkout/offers/${id}`, {
    method: "PUT",
    body,
    fallbackError: "Failed to save the offer.",
  })
}

export async function deleteOffer(id: string): Promise<null> {
  return pinggoRequest(await token(), `/checkout/offers/${id}`, {
    method: "DELETE",
    fallbackError: "Failed to delete the offer.",
  })
}

export async function retryOrder(id: string): Promise<OrderRow> {
  return pinggoRequest(await token(), `/checkout/orders/${id}/retry`, {
    method: "POST",
    fallbackError: "Failed to retry the order.",
  })
}
