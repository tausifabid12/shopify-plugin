"use client"

import { useActionState, useState } from "react"
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { loginWithPinggo, registerWithPinggo, type CredentialsState } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const loginInitialState: CredentialsState = { mode: "login" }
const registerInitialState: CredentialsState = { mode: "register" }

function Field({
  label,
  icon: Icon,
  type = "text",
  name,
  placeholder,
  autoComplete,
  required = true,
}: {
  label: string
  icon: React.ElementType
  type?: string
  name: string
  placeholder: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="h-10 bg-white pl-9 pr-10 text-sm shadow-none"
        />
      </div>
    </div>
  )
}

function PasswordField({
  label,
  name,
  placeholder,
  autoComplete,
}: {
  label: string
  name: string
  placeholder: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="h-10 bg-white pl-9 pr-10 text-sm shadow-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3">
      <svg viewBox="0 0 20 20" className="mt-px size-4 shrink-0 fill-destructive">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm text-destructive">{error}</p>
    </div>
  )
}

function SecureNote() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="size-3.5" />
      Securely stored in HTTP-only cookies — never exposed to the browser
    </div>
  )
}

export function PinggoAuthForm({ shop }: { shop?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [loginState, loginAction, loginPending] = useActionState(
    loginWithPinggo,
    loginInitialState
  )
  const [registerState, registerAction, registerPending] = useActionState(
    registerWithPinggo,
    registerInitialState
  )

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      {mode === "login" ? (
        <form action={loginAction} className="flex flex-col gap-5">
          {shop ? <input type="hidden" name="shop" value={shop} /> : null}
          <Field
            label="Email, username or mobile"
            icon={UserRound}
            name="uid"
            placeholder="you@example.com"
            autoComplete="username"
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="Your PingGo password"
            autoComplete="current-password"
          />
          <ErrorBanner error={loginState.error} />
          <Button
            type="submit"
            disabled={loginPending}
            className="h-10 w-full bg-[#008060] text-white hover:bg-[#006e52] active:bg-[#005e47] shadow-none"
          >
            {loginPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in &amp; connect store
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form action={registerAction} className="flex flex-col gap-5">
          {shop ? <input type="hidden" name="shop" value={shop} /> : null}
          <Field
            label="Full name"
            icon={UserRound}
            name="firstName"
            placeholder="Jane Doe"
            autoComplete="name"
          />
          <Field
            label="Email"
            icon={Mail}
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Username"
            icon={AtSign}
            name="username"
            placeholder="janedoe"
            autoComplete="username"
          />
          <Field
            label="Mobile number"
            icon={Phone}
            type="tel"
            name="mobile"
            placeholder="9876543210"
            autoComplete="tel"
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="Create a password"
            autoComplete="new-password"
          />
          <ErrorBanner error={registerState.error} />
          <Button
            type="submit"
            disabled={registerPending}
            className="h-10 w-full bg-[#008060] text-white hover:bg-[#006e52] active:bg-[#005e47] shadow-none"
          >
            {registerPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account &amp; connect store
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      )}

      <SecureNote />

      <div className="mt-5 border-t border-border pt-4 text-center">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#008060] transition-colors hover:text-[#006e52]"
        >
          <KeyRound className="size-3.5" />
          {mode === "login"
            ? "New to PingGo? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  )
}
