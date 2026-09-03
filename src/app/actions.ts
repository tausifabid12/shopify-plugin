"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API_KEY_COOKIE = "pinggo_api_key"
const USER_ID_COOKIE = "pinggo_user_id"
const SHOPIFY_SESSION_COOKIE = "shopify_session"

export type CredentialsState = {
  error?: string
}

// ─── PingGo onboarding ────────────────────────────────────────────────────────

export async function savePinggoCredentials(
  _prevState: CredentialsState,
  formData: FormData
): Promise<CredentialsState> {
  const apiKey = String(formData.get("apiKey") ?? "").trim()
  const userId = String(formData.get("userId") ?? "").trim()

  if (!apiKey || !userId) {
    return { error: "Enter both your PingGo API key and User ID." }
  }

  const cookieStore = await cookies()
  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  }

  cookieStore.set(API_KEY_COOKIE, apiKey, cookieOptions)
  cookieStore.set(USER_ID_COOKIE, userId, cookieOptions)

  redirect("/dashboard")
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

  cookieStore.set(API_KEY_COOKIE, "", clearOptions)
  cookieStore.set(USER_ID_COOKIE, "", clearOptions)
  cookieStore.set(SHOPIFY_SESSION_COOKIE, "", clearOptions)

  redirect("/")
}
