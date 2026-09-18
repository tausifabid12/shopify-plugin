"use server"

import { revalidatePath } from "next/cache"

import * as admin from "@/lib/checkout/admin-api"
import type {
  CheckoutConfigPayload,
  Offer,
  OfferInput,
  OrderRow,
  PaymentEnvironment,
  PaymentProviderKey,
  RefundRow,
  RouteRule,
} from "@/lib/checkout/types"

/**
 * Server actions for the checkout dashboard.
 *
 * Every mutation goes through here rather than through a client-side fetch, so
 * the PingGo JWT stays on the server. The alternative — passing `apiKey` into a
 * client component, as the WhatsApp module does — puts the token in the RSC
 * payload where any script on the page can read it.
 *
 * Actions return a discriminated result instead of throwing: a failed save
 * should show an inline message on the customiser, not replace the merchant's
 * unsaved work with an error boundary.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    }
  }
}

// ─── Checkout design ──────────────────────────────────────────────────────────

export async function saveDraftAction(
  patch: Partial<CheckoutConfigPayload>
): Promise<ActionResult<{ draft: CheckoutConfigPayload }>> {
  return run(() => admin.saveConfigDraft(patch))
}

export async function publishAction(): Promise<
  ActionResult<{ version: number; publishedAt: string }>
> {
  const result = await run(() => admin.publishConfig())
  if (result.ok) revalidatePath("/dashboard/checkout")
  return result
}

export async function discardDraftAction(): Promise<
  ActionResult<{ draft: CheckoutConfigPayload }>
> {
  const result = await run(() => admin.discardConfigDraft())
  if (result.ok) revalidatePath("/dashboard/checkout/customize")
  return result
}

// ─── Storefront switch ────────────────────────────────────────────────────────

export async function setCheckoutEnabledAction(
  enabled: boolean
): Promise<ActionResult<{ enabled: boolean }>> {
  const result = await run(() => admin.setCheckoutEnabled(enabled))
  if (result.ok) revalidatePath("/dashboard/checkout")
  return result
}

/**
 * Switching to live mode. `confirmed` carries the merchant's acknowledgement
 * from the warning dialog — the server refuses live without it (§27).
 */
export async function setEnvironmentAction(
  environment: PaymentEnvironment,
  confirmed?: boolean
): Promise<ActionResult<{ environment: PaymentEnvironment }>> {
  const result = await run(() => admin.setEnvironment(environment, confirmed))
  if (result.ok) revalidatePath("/dashboard/checkout")
  return result
}

// ─── Gateways & routing ───────────────────────────────────────────────────────

export async function saveCredentialAction(
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
): Promise<ActionResult<{ verification: { ok: boolean; error?: string } }>> {
  const result = await run(() => admin.saveCredential(provider, body))
  if (result.ok) revalidatePath("/dashboard/checkout")
  return result
}

export async function saveRoutingAction(
  environment: PaymentEnvironment,
  rules: RouteRule[]
): Promise<ActionResult<{ rules: RouteRule[] }>> {
  const result = await run(() => admin.saveRouting(environment, rules))
  if (result.ok) revalidatePath("/dashboard/checkout")
  return result
}

export async function verifyCredentialAction(
  provider: PaymentProviderKey,
  environment: PaymentEnvironment
): Promise<ActionResult<{ ok: boolean; error?: string }>> {
  return run(() => admin.verifyCredential(provider, environment))
}

export async function toggleCredentialAction(
  provider: PaymentProviderKey,
  environment: PaymentEnvironment,
  enabled: boolean
): Promise<ActionResult<{ enabled: boolean }>> {
  const result = await run(() => admin.toggleCredential(provider, environment, enabled))
  if (result.ok) revalidatePath("/dashboard/checkout/gateways")
  return result
}

export async function deleteCredentialAction(
  provider: PaymentProviderKey,
  environment: PaymentEnvironment
): Promise<ActionResult<null>> {
  const result = await run(() => admin.deleteCredential(provider, environment))
  if (result.ok) revalidatePath("/dashboard/checkout/gateways")
  return result
}

// ─── Money movement ───────────────────────────────────────────────────────────

/**
 * Issues a refund. `amount` is in minor units; omitting it refunds whatever is
 * left. The server enforces that refunds can never exceed the captured amount —
 * this action is a thin pass-through, not the guard.
 */
export async function createRefundAction(body: {
  transactionId: string
  amount?: number
  reason?: string
  notes?: string
}): Promise<ActionResult<RefundRow>> {
  const result = await run(() => admin.createRefund(body))
  if (result.ok) {
    revalidatePath("/dashboard/checkout/transactions")
    revalidatePath(`/dashboard/checkout/transactions/${body.transactionId}`)
  }
  return result
}

// ─── Offers (§24) ─────────────────────────────────────────────────────────────

export async function createOfferAction(
  body: OfferInput
): Promise<ActionResult<Offer>> {
  const result = await run(() => admin.createOffer(body))
  if (result.ok) revalidatePath("/dashboard/checkout/offers")
  return result
}

export async function updateOfferAction(
  id: string,
  body: OfferInput
): Promise<ActionResult<Offer>> {
  const result = await run(() => admin.updateOffer(id, body))
  if (result.ok) revalidatePath("/dashboard/checkout/offers")
  return result
}

export async function deleteOfferAction(id: string): Promise<ActionResult<null>> {
  const result = await run(() => admin.deleteOffer(id))
  if (result.ok) revalidatePath("/dashboard/checkout/offers")
  return result
}

/** Manual recovery for an order Shopify rejected — money taken, no order. */
export async function retryOrderAction(id: string): Promise<ActionResult<OrderRow>> {
  const result = await run(() => admin.retryOrder(id))
  if (result.ok) {
    revalidatePath("/dashboard/checkout/orders")
    revalidatePath("/dashboard/checkout")
  }
  return result
}
