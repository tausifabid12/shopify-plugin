/**
 * Indian states and union territories, with the province codes Shopify expects
 * on a `MailingAddressInput`.
 *
 * Sent as `provinceCode` on the order — Shopify matches loosely on the name but
 * reliably on the code, and a mismatched province silently breaks tax and
 * shipping rules on the merchant's side.
 */

export interface Region {
  code: string
  name: string
}

export const INDIAN_REGIONS: Region[] = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
]

const BY_CODE = new Map(INDIAN_REGIONS.map((r) => [r.code, r]))
const BY_NAME = new Map(INDIAN_REGIONS.map((r) => [r.name.toLowerCase(), r]))

export function regionByCode(code?: string): Region | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined
}

export function regionByName(name?: string): Region | undefined {
  return name ? BY_NAME.get(name.trim().toLowerCase()) : undefined
}

/** Accepts either a code or a full name — shoppers and autofill supply both. */
export function resolveRegion(value?: string): Region | undefined {
  return regionByCode(value) ?? regionByName(value)
}

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Normalises an Indian mobile number to E.164.
 *
 * Shoppers type all of `9876543210`, `+91 98765 43210`, `098765-43210`. The
 * backend validates strictly, so normalising here is the difference between a
 * shopper paying and a shopper seeing a validation error for a number that was
 * always fine.
 */
export function normalizePhone(raw: string, defaultCountryCode = "91"): string {
  const digits = raw.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) return digits

  const bare = digits.replace(/^0+/, "")
  if (bare.length === 10) return `+${defaultCountryCode}${bare}`
  if (bare.startsWith(defaultCountryCode) && bare.length === 12) return `+${bare}`
  return bare ? `+${bare}` : ""
}

/** Renders E.164 back as something familiar: "+91 98765 43210". */
export function displayPhone(e164?: string): string {
  if (!e164) return ""
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164)
  return match ? `+91 ${match[1]} ${match[2]}` : e164
}

export function isValidIndianPin(zip: string): boolean {
  return /^[1-9][0-9]{5}$/.test(zip.trim())
}

export function isValidPhone(e164: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(e164)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}
