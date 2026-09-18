"use client"

import * as React from "react"
import {
  Check,
  Copy,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  Unplug,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { PINGGO_API_BASE } from "@/lib/pinggo-api"
import type {
  CredentialSummary,
  PaymentEnvironment,
  PaymentProviderKey,
} from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import {
  deleteCredentialAction,
  saveCredentialAction,
  toggleCredentialAction,
  verifyCredentialAction,
} from "../actions"
import { Panel } from "../components/ui"

/**
 * Payment gateway setup (§8).
 *
 * Two rules shape this screen:
 *
 *  1. **Secrets are write-only.** The API never returns them, so every secret
 *     field starts blank and an empty field means "leave it as it is". A
 *     merchant can toggle a gateway or fix a typo in the key id without
 *     re-entering credentials they may not have to hand.
 *
 *  2. **Test and live are separate credential sets**, edited on separate tabs,
 *     because pasting a live key into a sandbox field is how real money gets
 *     taken by accident (§27).
 */

interface ProviderSpec {
  key: PaymentProviderKey
  label: string
  blurb: string
  publicKeyLabel: string
  publicKeyPlaceholder: string
  secretLabel: string
  /** PhonePe needs a client version; Razorpay does not. */
  needsClientVersion?: boolean
  /** Razorpay signs webhooks with a secret; PhonePe uses basic-auth creds. */
  webhookStyle: "secret" | "basic"
  docsHint: string
}

const PROVIDERS: ProviderSpec[] = [
  {
    key: "razorpay",
    label: "Razorpay",
    blurb: "Cards, UPI, net banking and wallets. Renders inside your checkout.",
    publicKeyLabel: "Key ID",
    publicKeyPlaceholder: "rzp_test_XXXXXXXXXXXX",
    secretLabel: "Key secret",
    webhookStyle: "secret",
    docsHint: "Dashboard → Account & Settings → API Keys",
  },
  {
    key: "phonepe",
    label: "PhonePe",
    blurb: "UPI-first checkout, rendered in an iframe inside your page.",
    publicKeyLabel: "Client ID",
    publicKeyPlaceholder: "SU2XXXXXXXXXXXXX",
    secretLabel: "Client secret",
    needsClientVersion: true,
    webhookStyle: "basic",
    docsHint: "PhonePe Business → Developer Settings → API Keys",
  },
]

export function GatewaysClient({
  initial,
  activeEnvironment,
}: {
  initial: CredentialSummary[]
  activeEnvironment: PaymentEnvironment
}) {
  const [environment, setEnvironment] = React.useState<PaymentEnvironment>(
    activeEnvironment
  )
  const [credentials, setCredentials] = React.useState(initial)

  const update = (next: CredentialSummary) => {
    setCredentials((list) => {
      const rest = list.filter(
        (c) => !(c.provider === next.provider && c.environment === next.environment)
      )
      return [...rest, next]
    })
  }

  const remove = (provider: PaymentProviderKey, env: PaymentEnvironment) => {
    setCredentials((list) =>
      list.filter((c) => !(c.provider === provider && c.environment === env))
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <EnvironmentTabs
        value={environment}
        onChange={setEnvironment}
        activeEnvironment={activeEnvironment}
      />

      {PROVIDERS.map((spec) => (
        <GatewayCard
          key={`${spec.key}-${environment}`}
          spec={spec}
          environment={environment}
          credential={credentials.find(
            (c) => c.provider === spec.key && c.environment === environment
          )}
          onSaved={update}
          onRemoved={() => remove(spec.key, environment)}
        />
      ))}
    </div>
  )
}

// ─── Environment ──────────────────────────────────────────────────────────────

function EnvironmentTabs({
  value,
  onChange,
  activeEnvironment,
}: {
  value: PaymentEnvironment
  onChange: (value: PaymentEnvironment) => void
  activeEnvironment: PaymentEnvironment
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
        {(["test", "live"] as PaymentEnvironment[]).map((env) => (
          <button
            key={env}
            type="button"
            onClick={() => onChange(env)}
            aria-pressed={value === env}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
              value === env
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {env} mode
          </button>
        ))}
      </div>

      <p className="text-[12px] text-muted-foreground">
        Your checkout is currently running in{" "}
        <span className="font-semibold text-foreground">{activeEnvironment}</span>{" "}
        mode.
      </p>
    </div>
  )
}

// ─── Gateway card ─────────────────────────────────────────────────────────────

function GatewayCard({
  spec,
  environment,
  credential,
  onSaved,
  onRemoved,
}: {
  spec: ProviderSpec
  environment: PaymentEnvironment
  credential?: CredentialSummary
  onSaved: (credential: CredentialSummary) => void
  onRemoved: () => void
}) {
  const connected = Boolean(credential?.connected)
  const [open, setOpen] = React.useState(!connected)
  const [busy, setBusy] = React.useState<null | "save" | "verify" | "delete" | "toggle">(
    null
  )
  const [message, setMessage] = React.useState<
    { tone: "ok" | "error"; text: string } | null
  >(null)

  const [form, setForm] = React.useState({
    publicKey: "",
    secret: "",
    webhookSecret: "",
    clientVersion: credential?.clientVersion ?? "1",
    webhookUsername: "",
    webhookPassword: "",
  })

  const webhookUrl = `${PINGGO_API_BASE}/checkout/gateway-webhooks/${spec.key}`

  const handleSave = async () => {
    if (!form.publicKey.trim()) {
      setMessage({ tone: "error", text: `Enter your ${spec.publicKeyLabel}.` })
      return
    }
    if (!connected && !form.secret.trim()) {
      setMessage({ tone: "error", text: `Enter your ${spec.secretLabel}.` })
      return
    }

    setBusy("save")
    setMessage(null)

    const result = await saveCredentialAction(spec.key, {
      environment,
      publicKey: form.publicKey.trim(),
      // Blank means "unchanged" — never send an empty string, which would wipe
      // a working secret.
      secret: form.secret.trim() || undefined,
      webhookSecret: form.webhookSecret.trim() || undefined,
      clientVersion: spec.needsClientVersion ? form.clientVersion.trim() : undefined,
      webhookUsername: form.webhookUsername.trim() || undefined,
      webhookPassword: form.webhookPassword.trim() || undefined,
      enabled: credential?.enabled ?? true,
    })

    setBusy(null)

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error })
      return
    }

    const verification = result.data.verification
    setMessage(
      verification.ok
        ? { tone: "ok", text: `${spec.label} connected and verified.` }
        : {
            tone: "error",
            text:
              verification.error ||
              "Saved, but the gateway rejected these credentials.",
          }
    )

    onSaved({
      provider: spec.key,
      environment,
      connected: true,
      enabled: credential?.enabled ?? true,
      publicKeyMasked: maskKey(form.publicKey.trim()),
      hasWebhookSecret:
        Boolean(form.webhookSecret.trim() || form.webhookPassword.trim()) ||
        Boolean(credential?.hasWebhookSecret),
      clientVersion: spec.needsClientVersion ? form.clientVersion.trim() : undefined,
      verifiedAt: verification.ok ? new Date().toISOString() : undefined,
      verificationError: verification.ok ? undefined : verification.error,
    })

    // Secrets are cleared from memory once saved; the UI never holds them.
    setForm((f) => ({
      ...f,
      secret: "",
      webhookSecret: "",
      webhookPassword: "",
    }))
    if (verification.ok) setOpen(false)
  }

  const handleVerify = async () => {
    setBusy("verify")
    setMessage(null)
    const result = await verifyCredentialAction(spec.key, environment)
    setBusy(null)
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error })
      return
    }
    setMessage(
      result.data.ok
        ? { tone: "ok", text: "Credentials verified with the gateway." }
        : { tone: "error", text: result.data.error || "Verification failed." }
    )
  }

  const handleToggle = async (enabled: boolean) => {
    setBusy("toggle")
    const result = await toggleCredentialAction(spec.key, environment, enabled)
    setBusy(null)
    if (result.ok && credential) {
      onSaved({ ...credential, enabled: result.data.enabled })
    } else if (!result.ok) {
      setMessage({ tone: "error", text: result.error })
    }
  }

  const handleDelete = async () => {
    setBusy("delete")
    const result = await deleteCredentialAction(spec.key, environment)
    setBusy(null)
    if (result.ok) {
      onRemoved()
      setOpen(true)
      setMessage(null)
    } else {
      setMessage({ tone: "error", text: result.error })
    }
  }

  return (
    <Panel padded={false}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{spec.label}</h2>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/15 ring-inset">
                <Check className="size-3" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border ring-inset">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{spec.blurb}</p>
          {connected && (
            <p className="mt-1.5 font-mono text-[12px] text-muted-foreground">
              {credential?.publicKeyMasked}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {connected && (
            <>
              {busy === "toggle" && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={credential?.enabled ?? false}
                disabled={busy !== null}
                onCheckedChange={handleToggle}
              />
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {connected ? "Manage" : "Connect"}
          </Button>
        </div>
      </div>

      {credential?.verificationError && !open && (
        <div className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-900">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>{credential.verificationError}</span>
        </div>
      )}

      {/* Form */}
      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-5 py-4">
          {message && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px]",
                message.tone === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-700"
              )}
            >
              {message.tone === "ok" ? (
                <ShieldCheck className="mt-px size-3.5 shrink-0" />
              ) : (
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <p className="text-[12px] text-muted-foreground">
            Find these in {spec.docsHint}. Use your{" "}
            <span className="font-medium text-foreground">{environment}</span>{" "}
            credentials — they are stored separately from the other mode.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={spec.publicKeyLabel}>
              <Input
                value={form.publicKey}
                placeholder={spec.publicKeyPlaceholder}
                spellCheck={false}
                onChange={(e) => setForm((f) => ({ ...f, publicKey: e.target.value }))}
              />
            </Field>

            <Field
              label={spec.secretLabel}
              hint={connected ? "Leave blank to keep the current secret" : undefined}
            >
              <Input
                type="password"
                value={form.secret}
                placeholder={connected ? "••••••••••••" : ""}
                autoComplete="off"
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
              />
            </Field>

            {spec.needsClientVersion && (
              <Field label="Client version" hint="PhonePe provides this with your keys.">
                <Input
                  value={form.clientVersion}
                  placeholder="1"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientVersion: e.target.value }))
                  }
                />
              </Field>
            )}
          </div>

          {/* Webhooks */}
          <div className="rounded-lg border border-border bg-muted/30 p-3.5">
            <p className="text-[12px] font-semibold text-foreground">Webhook</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Add this URL in your {spec.label} dashboard. Without it, payments
              still work but confirmations arrive late.
            </p>

            <CopyableUrl url={webhookUrl} />

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {spec.webhookStyle === "secret" ? (
                <Field
                  label="Webhook secret"
                  hint={
                    credential?.hasWebhookSecret
                      ? "Leave blank to keep the current secret"
                      : "The secret you set when creating the webhook"
                  }
                >
                  <Input
                    type="password"
                    value={form.webhookSecret}
                    autoComplete="off"
                    placeholder={credential?.hasWebhookSecret ? "••••••••" : ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, webhookSecret: e.target.value }))
                    }
                  />
                </Field>
              ) : (
                <>
                  <Field label="Webhook username">
                    <Input
                      value={form.webhookUsername}
                      autoComplete="off"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, webhookUsername: e.target.value }))
                      }
                    />
                  </Field>
                  <Field
                    label="Webhook password"
                    hint={
                      credential?.hasWebhookSecret
                        ? "Leave blank to keep the current password"
                        : undefined
                    }
                  >
                    <Input
                      type="password"
                      value={form.webhookPassword}
                      autoComplete="off"
                      placeholder={credential?.hasWebhookSecret ? "••••••••" : ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, webhookPassword: e.target.value }))
                      }
                    />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={busy !== null}>
              {busy === "save" && <Loader2 className="animate-spin" />}
              {connected ? "Save changes" : "Connect gateway"}
            </Button>

            {connected && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  disabled={busy !== null}
                >
                  {busy === "verify" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  Test connection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={busy !== null}
                  className="ml-auto"
                >
                  {busy === "delete" ? <Loader2 className="animate-spin" /> : <Unplug />}
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked — the URL is selectable, so this is recoverable.
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-white px-2.5 py-1.5 font-mono text-[12px] text-foreground">
        {url}
      </code>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••"
  return `${key.slice(0, Math.min(12, key.length - 4))}••••${key.slice(-4)}`
}
