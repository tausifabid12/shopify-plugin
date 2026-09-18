/**
 * Money formatting for the checkout.
 *
 * Amounts arrive from the API as integers in minor units (paise). This is the
 * only place that turns one into something a human reads — a component doing
 * its own `amount / 100` will eventually render `₹1299.0000000001`, and on a
 * payment page that is not a cosmetic bug.
 */

const MINOR_UNIT_DIGITS: Record<string, number> = {
  INR: 2,
}

function digitsFor(currency: string): number {
  return MINOR_UNIT_DIGITS[currency.toUpperCase()] ?? 2
}

/** Renders minor units as a localized currency string, e.g. "₹1,499.00". */
export function formatMoney(amount: number, currency = "INR"): string {
  const digits = digitsFor(currency)
  const value = amount / 10 ** digits
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(digits)}`
  }
}

/**
 * Drops a trailing ".00" — right for prices in a list, wrong for a total the
 * shopper is about to be charged, where the exact figure should be unambiguous.
 */
export function formatMoneyCompact(amount: number, currency = "INR"): string {
  const digits = digitsFor(currency)
  if (amount % 10 ** digits === 0) {
    const value = amount / 10 ** digits
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `${currency.toUpperCase()} ${value}`
    }
  }
  return formatMoney(amount, currency)
}

/** Saving versus the most expensive method, for "Save ₹100 by paying online". */
export function savingsAgainst(cheapest: number, other: number): number {
  return Math.max(0, other - cheapest)
}
