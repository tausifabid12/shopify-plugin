"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  pinggoLoginRequest,
  pinggoRegisterRequest,
} from "@/lib/pinggo-auth"

const TOKEN_COOKIE = "pinggo_token"
const USER_ID_COOKIE = "pinggo_user_id"
const SHOPIFY_SESSION_COOKIE = "shopify_session"
const SHOPIFY_SHOP_COOKIE = "shopify_shop"

export type CredentialsState = {
  error?: string
  mode?: "login" | "register"
}

const sessionCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

function readShop(formData: FormData): string | undefined {
  const fromForm = String(formData.get("shop") ?? "").trim()
  if (fromForm) return fromForm
  return undefined
}

async function setPinggoSession(token: string, userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE, token, sessionCookieOptions)
  cookieStore.set(USER_ID_COOKIE, userId, sessionCookieOptions)
}

/**
 * Resolve the Shopify OAuth entry URL. The `?shop=` domain is carried through
 * via the form + a short-lived cookie.
 */
async function connectTarget(shop?: string): Promise<string> {
  const cookieStore = await cookies()
  const resolvedShop = shop || cookieStore.get(SHOPIFY_SHOP_COOKIE)?.value
  // A real Shopify install always carries a shop domain (form or cookie).
  // When there is none, the user logged in from the app home page directly,
  // so send them to the dashboard instead of the OAuth entry (which 400s
  // without a valid `shop` param).
  return resolvedShop
    ? `/api/auth?shop=${encodeURIComponent(resolvedShop)}`
    : "/dashboard"
}

// ─── PingGo login ─────────────────────────────────────────────────────────────

export async function loginWithPinggo(
  _prevState: CredentialsState,
  formData: FormData
): Promise<CredentialsState> {
  const uid = String(formData.get("uid") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()
  const shop = readShop(formData)

  if (!uid || !password) {
    return {
      error: "Enter your PingGo email, username or mobile and password.",
      mode: "login",
    }
  }

  const { ok, json } = await pinggoLoginRequest({ uid, password })

  if (!ok || !json?.success || !json?.data?.token || !json?.data?.user?._id) {
    return {
      error: json?.message || "Invalid PingGo credentials.",
      mode: "login",
    }
  }

  await setPinggoSession(json.data.token, json.data.user._id)
  redirect(await connectTarget(shop))
}

// ─── PingGo registration ──────────────────────────────────────────────────────

export async function registerWithPinggo(
  _prevState: CredentialsState,
  formData: FormData
): Promise<CredentialsState> {
  const email = String(formData.get("email") ?? "").trim()
  const username = String(formData.get("username") ?? "").trim()
  const firstName = String(formData.get("firstName") ?? "").trim()
  const mobile = String(formData.get("mobile") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()
  const shop = readShop(formData)

  if (!email || !username || !firstName || !mobile || !password) {
    return {
      error: "Fill in all required fields to create your PingGo account.",
      mode: "register",
    }
  }

  const { ok, json } = await pinggoRegisterRequest({
    email,
    username,
    firstName,
    mobile: { isd: "+91", number: mobile },
    password,
  })

  if (!ok || !json?.success) {
    const message =
      json?.message ||
      (typeof json?.error === "string" ? json.error : undefined) ||
      "Registration failed."
    return {
      error: message,
      mode: "register",
    }
  }

  // Auto-authenticate the newly created user. The `/vendors` endpoint returns a
  // token signed with the Vendor doc id, but our Shopify linkage (and the rest
  // of the Pinggo API) expects the User._id that `/auth/login` returns.
  const login = await pinggoLoginRequest({ uid: email, password })

  if (!login.ok || !login.json?.success || !login.json?.data?.token || !login.json?.data?.user?._id) {
    return {
      error: "Account created but auto sign-in failed. Please sign in.",
      mode: "register",
    }
  }

  await setPinggoSession(login.json.data.token, login.json.data.user._id)
  redirect(await connectTarget(shop))
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Clears all session cookies (PingGo credentials + Shopify OAuth session)
 * and redirects back to the home / onboarding screen.
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies()

  const clearOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  }

  cookieStore.set(TOKEN_COOKIE, "", clearOptions)
  cookieStore.set(USER_ID_COOKIE, "", clearOptions)
  cookieStore.set(SHOPIFY_SESSION_COOKIE, "", clearOptions)
  cookieStore.set(SHOPIFY_SHOP_COOKIE, "", clearOptions)

  redirect("/")
}
