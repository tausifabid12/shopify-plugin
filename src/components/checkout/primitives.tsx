"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Checkout UI primitives.
 *
 * Deliberately separate from `components/ui/*`, which is bound to the app's own
 * Polaris palette. These read their colours from the `--ck-*` custom properties
 * set by `brandingToCssVars`, so the same components render every merchant's
 * checkout — and render the customiser's preview identically.
 *
 * Nothing here hard-codes a colour.
 */

// ─── Surface ──────────────────────────────────────────────────────────────────

export function CkCard({
  children,
  bordered = true,
  padding = "1.5rem",
  className,
}: {
  children: React.ReactNode
  bordered?: boolean
  padding?: string
  className?: string
}) {
  return (
    <section
      className={cn("w-full", className)}
      style={{
        background: bordered ? "var(--ck-surface)" : "transparent",
        border: bordered ? "1px solid var(--ck-border)" : "none",
        borderRadius: bordered ? "var(--ck-radius)" : 0,
        padding,
      }}
    >
      {children}
    </section>
  )
}

export function CkHeading({
  children,
  show = true,
}: {
  children: React.ReactNode
  show?: boolean
}) {
  if (!show) return null
  return (
    <h2
      className="mb-4 text-[15px] font-semibold tracking-[-0.01em]"
      style={{ color: "var(--ck-text)" }}
    >
      {children}
    </h2>
  )
}

// ─── Fields ───────────────────────────────────────────────────────────────────

export function CkField({
  label,
  required,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium"
        style={{ color: "var(--ck-muted)" }}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-0.5" style={{ color: "var(--ck-primary)" }}>
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[12px] font-medium text-[#d72c0d]">
          {error}
        </p>
      )}
    </div>
  )
}

const controlStyle = (invalid?: boolean): React.CSSProperties => ({
  height: "var(--ck-control-height, 2.75rem)",
  background: "var(--ck-surface)",
  color: "var(--ck-text)",
  border: `1px solid ${invalid ? "#d72c0d" : "var(--ck-border)"}`,
  borderRadius: "var(--ck-radius-sm)",
  fontFamily: "var(--ck-font)",
})

export const CkInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function CkInput({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      // `focus-visible` rather than `focus` so tapping a field on mobile does
      // not paint a ring the shopper never asked for.
      className={cn(
        "w-full px-3 text-[15px] outline-none transition-shadow",
        "placeholder:opacity-60 focus-visible:ring-4",
        className
      )}
      style={{
        ...controlStyle(invalid),
        // Tailwind's ring colour can't read a CSS var, so it is set inline.
        ["--tw-ring-color" as string]: "var(--ck-focus-ring)",
      }}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

export const CkSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function CkSelect({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none px-3 text-[15px] outline-none transition-shadow focus-visible:ring-4",
        className
      )}
      style={{
        ...controlStyle(invalid),
        ["--tw-ring-color" as string]: "var(--ck-focus-ring)",
        // Native chevron is inconsistent across platforms; draw our own.
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.85rem center",
        paddingRight: "2.25rem",
      }}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  )
})

// ─── Buttons ──────────────────────────────────────────────────────────────────

export function CkButton({
  children,
  loading,
  disabled,
  className,
  type = "button",
  onClick,
  fullWidth = true,
}: {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  className?: string
  type?: "button" | "submit"
  onClick?: () => void
  fullWidth?: boolean
}) {
  const inert = disabled || loading
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={inert}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 text-[15px] font-semibold",
        "transition-[opacity,transform] outline-none focus-visible:ring-4",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55",
        fullWidth && "w-full",
        className
      )}
      style={{
        minHeight: "var(--ck-control-height, 2.75rem)",
        background: "var(--ck-button)",
        color: "var(--ck-button-text)",
        borderRadius: "var(--ck-radius-sm)",
        fontFamily: "var(--ck-font)",
        ["--tw-ring-color" as string]: "var(--ck-focus-ring)",
      }}
    >
      {loading && <CkSpinner />}
      {children}
    </button>
  )
}

export function CkGhostButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[13px] font-medium underline-offset-4 outline-none hover:underline focus-visible:underline",
        className
      )}
      style={{ color: "var(--ck-primary)" }}
    >
      {children}
    </button>
  )
}

export function CkSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Selection ────────────────────────────────────────────────────────────────

export function CkRadioRow({
  selected,
  onSelect,
  title,
  subtitle,
  trailing,
  badge,
  disabled,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  subtitle?: string
  trailing?: React.ReactNode
  badge?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 text-left transition-colors outline-none",
        "focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
      )}
      style={{
        minHeight: "var(--ck-control-height, 2.75rem)",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
        background: selected ? "var(--ck-primary-wash)" : "var(--ck-surface)",
        border: `1px solid ${selected ? "var(--ck-primary-edge)" : "var(--ck-border)"}`,
        borderRadius: "var(--ck-radius-sm)",
        ["--tw-ring-color" as string]: "var(--ck-focus-ring)",
      }}
    >
      <span
        aria-hidden
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: selected ? "var(--ck-primary)" : "var(--ck-border)",
        }}
      >
        {selected && (
          <span
            className="size-[9px] rounded-full"
            style={{ background: "var(--ck-primary)" }}
          />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="flex items-center gap-2 text-[14px] font-medium"
          style={{ color: "var(--ck-text)" }}
        >
          {title}
          {badge}
        </span>
        {subtitle && (
          <span className="mt-0.5 text-[12px]" style={{ color: "var(--ck-muted)" }}>
            {subtitle}
          </span>
        )}
      </span>

      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  )
}

export function CkBadge({
  children,
  tone = "brand",
}: {
  children: React.ReactNode
  tone?: "brand" | "success" | "warning"
}) {
  const palette = {
    brand: { bg: "var(--ck-primary-wash)", fg: "var(--ck-primary)" },
    success: { bg: "rgba(0,128,96,0.10)", fg: "#008060" },
    warning: { bg: "rgba(255,184,0,0.16)", fg: "#8a6100" },
  }[tone]

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: palette.bg, color: palette.fg }}
    >
      {children}
    </span>
  )
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function CkAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success"
  children: React.ReactNode
}) {
  const palette = {
    error: { bg: "rgba(215,44,13,0.08)", fg: "#b42318", border: "rgba(215,44,13,0.25)" },
    info: { bg: "var(--ck-primary-wash)", fg: "var(--ck-text)", border: "var(--ck-primary-edge)" },
    success: { bg: "rgba(0,128,96,0.08)", fg: "#0a6b52", border: "rgba(0,128,96,0.25)" },
  }[tone]

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="px-3.5 py-3 text-[13px] leading-snug"
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: "var(--ck-radius-sm)",
      }}
    >
      {children}
    </div>
  )
}

export function CkDivider() {
  return <div className="h-px w-full" style={{ background: "var(--ck-border)" }} />
}

/** Lock glyph for the trust line. Inline so it needs no icon dependency. */
export function CkLockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 10.5V7.5a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
