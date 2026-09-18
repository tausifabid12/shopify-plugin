/**
 * Loads a third-party gateway SDK once per page.
 *
 * Both gateways ship a global-attaching script, and both get mounted and
 * unmounted repeatedly as a shopper switches methods or retries a failed
 * payment. Without de-duplication that means a stack of duplicate <script> tags
 * and, worse, duplicate global handlers firing the same callback twice.
 *
 * Promises are cached by URL, so concurrent callers share one network request
 * and a second mount resolves instantly.
 */

const cache = new Map<string, Promise<void>>()

export function loadScript(src: string, timeoutMs = 15_000): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Gateway scripts can only load in the browser."))
  }

  const cached = cache.get(src)
  if (cached) return cached

  const promise = new Promise<void>((resolve, reject) => {
    // A previous page render may already have injected it.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-ck-src="${CSS.escape(src)}"]`
    )
    if (existing?.dataset.ckLoaded === "true") {
      resolve()
      return
    }

    const script = existing ?? document.createElement("script")
    let settled = false

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      // Drop the cache entry so a retry can try again rather than replaying
      // the same rejection forever.
      cache.delete(src)
      reject(new Error("The payment gateway took too long to load."))
    }, timeoutMs)

    script.addEventListener("load", () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      script.dataset.ckLoaded = "true"
      resolve()
    })

    script.addEventListener("error", () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cache.delete(src)
      script.remove()
      reject(new Error("The payment gateway could not be loaded."))
    })

    if (!existing) {
      script.src = src
      script.async = true
      script.dataset.ckSrc = src
      document.head.appendChild(script)
    }
  })

  cache.set(src, promise)
  return promise
}

export const RAZORPAY_CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js"
export const PHONEPE_CHECKOUT_JS = "https://mercury.phonepe.com/web/bundle/checkout.js"
