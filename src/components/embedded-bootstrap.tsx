"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

/**
 * Establishes the PingGo session when the app is running inside the Shopify
 * admin iframe.
 *
 * Runs once on load, before the dashboard is reachable: the iframe has no
 * cookie yet, so it asks App Bridge for a session token, trades it for one at
 * `/api/shopify/session`, and then navigates on.
 *
 * Token source order matters. The `id_token` Shopify puts in the URL is already
 * there on first paint, so it is tried first and saves a round trip — but it
 * goes stale in about a minute, so a reloaded tab falls back to asking App
 * Bridge for a fresh one.
 */

declare global {
  interface Window {
    shopify?: { idToken?: () => Promise<string> }
  }
}

type Phase = "connecting" | "not_linked" | "error"

export function EmbeddedBootstrap({
  urlIdToken,
  shop,
}: {
  urlIdToken?: string
  shop?: string
}) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<Phase>("connecting")
  const [message, setMessage] = React.useState<string>()

  // Guards against React's development double-invoke firing the exchange twice.
  const started = React.useRef(false)

  React.useEffect(() => {
    if (started.current) return
    started.current = true

    let cancelled = false

    /** Waits for App Bridge, which loads asynchronously from Shopify's CDN. */
    async function appBridgeToken(timeoutMs = 8000): Promise<string | null> {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (typeof window.shopify?.idToken === "function") {
          try {
            return await window.shopify.idToken()
          } catch {
            return null
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 150))
      }
      return null
    }

    async function exchange(token: string) {
      const res = await fetch("/api/shopify/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      })
      return { status: res.status, body: await res.json().catch(() => ({})) }
    }

    async function run() {
      try {
        // 1. The token already in the URL, if Shopify put one there.
        if (urlIdToken) {
          const first = await exchange(urlIdToken)
          if (cancelled) return
          if (first.status === 200) {
            router.replace("/dashboard")
            return
          }
          if (first.status === 409) {
            setPhase("not_linked")
            setMessage(first.body?.message)
            return
          }
          // 401 means stale — fall through and ask for a fresh one.
        }

        // 2. A fresh token from App Bridge.
        const fresh = await appBridgeToken()
        if (cancelled) return

        if (!fresh) {
          setPhase("error")
          setMessage(
            "Couldn't reach Shopify App Bridge. Reload the page, or open PingGo again from your Shopify admin."
          )
          return
        }

        const second = await exchange(fresh)
        if (cancelled) return

        if (second.status === 200) {
          router.replace("/dashboard")
          return
        }
        if (second.status === 409) {
          setPhase("not_linked")
          setMessage(second.body?.message)
          return
        }

        setPhase("error")
        setMessage(second.body?.message || "Could not start your PingGo session.")
      } catch {
        if (!cancelled) {
          setPhase("error")
          setMessage("Something went wrong connecting to PingGo.")
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [urlIdToken, router])

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f6f6f7] px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white px-6 py-8 text-center shadow-sm">
        {phase === "connecting" && (
          <>
            <Spinner />
            <p className="mt-4 text-sm font-medium text-foreground">
              Connecting to PingGo…
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              This only takes a moment.
            </p>
          </>
        )}

        {phase === "not_linked" && (
          <>
            <h1 className="text-[17px] font-semibold text-foreground">
              Finish connecting your store
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {message ??
                "This store isn't linked to a PingGo account yet."}{" "}
              Sign in to PingGo once to link it — after that the app opens
              straight into your dashboard here.
            </p>
            {/*
              Opened in a new top-level tab on purpose. Signing in and granting
              access both need a first-party context: Shopify's consent screen
              refuses to be framed, and the sign-in cookie wouldn't stick here.
            */}
            <a
              href={
                shop
                  ? `/api/auth?shop=${encodeURIComponent(shop)}`
                  : "/"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[#008060] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#006e52]"
            >
              Sign in &amp; link store
            </a>
            <p className="mt-3 text-[12px] text-muted-foreground">
              Come back to this tab once you&apos;re done and reload.
            </p>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 className="text-[17px] font-semibold text-foreground">
              Couldn&apos;t connect
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="mx-auto size-7 animate-spin text-[#008060]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="#d0d3d6" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
