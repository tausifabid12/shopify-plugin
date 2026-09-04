import { cookies } from "next/headers"

// ─── Cookie names ─────────────────────────────────────────────────────────────
const TOKEN_COOKIE = "pinggo_token"
const USER_ID_COOKIE = "pinggo_user_id"
const SHOPIFY_SESSION_COOKIE = "shopify_session"

// ─── PingGo credentials (JWT obtained via login / registration) ───────────────
//
// `apiKey` holds the PingGo JWT bearer token. It is passed to the Pinggo backend
// as `Authorization: Bearer <token>` (the backend derives the user ID from the
// token). It is an HTTP-only cookie and never exposed to the browser.

export type PinggoCredentials = {
  apiKey: string | undefined
  userId: string | undefined
}

export async function getPinggoCredentials(): Promise<PinggoCredentials> {
  const cookieStore = await cookies()
  return {
    apiKey: cookieStore.get(TOKEN_COOKIE)?.value,
    userId: cookieStore.get(USER_ID_COOKIE)?.value,
  }
}

export async function hasPinggoCredentials(): Promise<boolean> {
  const { apiKey, userId } = await getPinggoCredentials()
  return Boolean(apiKey && userId)
}

// ─── Shopify session (obtained automatically via OAuth) ───────────────────────

export type ShopifySession = {
  shop: string
  storeId?: string
  scope?: string
}

/**
 * Returns the Shopify session stored after OAuth, or null if the merchant
 * has not installed / authenticated the app yet.
 *
 * Note: this only contains non-sensitive store metadata. The Shopify access
 * token is stored server-side and never reaches the browser.
 */
export async function getShopifySession(): Promise<ShopifySession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SHOPIFY_SESSION_COOKIE)?.value
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "shop" in parsed &&
      typeof (parsed as Record<string, unknown>).shop === "string"
    ) {
      return parsed as ShopifySession
    }
    return null
  } catch {
    return null
  }
}

export async function hasShopifySession(): Promise<boolean> {
  return (await getShopifySession()) !== null
}
