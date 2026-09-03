"use client"

import { useActionState, useState } from "react"
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react"

import { savePinggoCredentials, type CredentialsState } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: CredentialsState = {}

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(savePinggoCredentials, initialState)
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <form action={formAction} className="flex flex-col gap-5">
        {/* API Key */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiKey" className="text-sm font-medium text-foreground">
            PingGo API key
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="apiKey"
              name="apiKey"
              type={showApiKey ? "text" : "password"}
              placeholder="sk_live_..."
              className="h-10 bg-white pl-9 pr-10 text-sm shadow-none"
              autoComplete="off"
              required
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showApiKey ? "Hide API key" : "Show API key"}
            >
              {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* User ID */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userId" className="text-sm font-medium text-foreground">
            PingGo user ID
          </Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="userId"
              name="userId"
              type="text"
              placeholder="user_..."
              className="h-10 bg-white pl-9 text-sm shadow-none"
              autoComplete="off"
              required
            />
          </div>
        </div>

        {state?.error ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3">
            <svg viewBox="0 0 20 20" className="mt-px size-4 shrink-0 fill-destructive">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full bg-[#008060] text-white hover:bg-[#006e52] active:bg-[#005e47] shadow-none"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              Connect store
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Stored in a secure HTTP-only cookie — never exposed to the browser
        </div>
      </form>
    </div>
  )
}
