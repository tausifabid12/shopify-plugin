import { PINGGO_API_BASE } from "./pinggo-api"

export type PinggoLoginInput = {
  uid: string
  password: string
}

export type PinggoRegisterInput = {
  email: string
  username: string
  firstName: string
  mobile: { isd: string; number: string }
  password: string
}

export type PinggoLinkStoreInput = {
  shopDomain: string
  accessToken: string
  scope?: string
}

type PinggoApiResponse = {
  success?: boolean
  statusCode?: number
  message?: string
  error?: unknown
  data?: {
    token?: string
    tokenExpiredAt?: string
    user?: {
      _id?: string
      email?: string
      username?: string
      role?: string
    }
    userId?: string
  }
  accessToken?: string
}

async function readJson(res: Response): Promise<PinggoApiResponse> {
  try {
    return (await res.json()) as PinggoApiResponse
  } catch {
    return {}
  }
}

/** POST /auth/login — returns the Pinggo JWT + user profile on success. */
export async function pinggoLoginRequest(input: PinggoLoginInput) {
  const res = await fetch(`${PINGGO_API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  })
  return { ok: res.ok, json: await readJson(res) }
}

/** POST /vendors — creates a vendor (Pinggo) account with the minimum fields. */
export async function pinggoRegisterRequest(input: PinggoRegisterInput) {
  const res = await fetch(`${PINGGO_API_BASE}/vendors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      username: input.username,
      fullName: { firstName: input.firstName, lastName: "" },
      mobile: input.mobile,
      password: input.password,
      confirmPassword: input.password,
    }),
    cache: "no-store",
  })
  return { ok: res.ok, json: await readJson(res) }
}

/**
 * POST /shopify-app/stores/link — links the Shopify store to the authenticated
 * Pinggo user. The server verifies the token, stores it encrypted and
 * (re)registers the store's Shopify webhook subscriptions. The token is sent
 * server-side and never reaches the browser.
 */
export async function pinggoLinkStoreRequest(
  token: string,
  input: PinggoLinkStoreInput
) {
  const res = await fetch(`${PINGGO_API_BASE}/shopify-app/stores/link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  })
  return { ok: res.ok, json: await readJson(res) }
}
