import { cookies } from "next/headers"

// ─── Cookie names ─────────────────────────────────────────────────────────────
const API_KEY_COOKIE = "pinggo_api_key"
const USER_ID_COOKIE = "pinggo_user_id"
const SHOPIFY_SESSION_COOKIE = "shopify_session"

// ─── PingGo credentials (manually entered by the user in the onboarding form) ─

export type PinggoCredentials = {
  apiKey: string | undefined
  userId: string | undefined
}

export async function getPinggoCredentials(): Promise<PinggoCredentials> {
  const cookieStore = await cookies()
  return {
    apiKey: cookieStore.get(API_KEY_COOKIE)?.value,
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
  accessToken: string
}

/**
 * Returns the Shopify session stored after OAuth, or null if the merchant
 * has not installed / authenticated the app yet.
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
      "accessToken" in parsed &&
      typeof (parsed as Record<string, unknown>).shop === "string" &&
      typeof (parsed as Record<string, unknown>).accessToken === "string"
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
