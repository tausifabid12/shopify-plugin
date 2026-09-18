import type {
  CheckoutAddress,
  CheckoutContact,
  PublicCheckoutSession,
  PublicPaymentMethod,
} from "./types"

/**
 * Sample data for the customiser's live preview.
 *
 * Chosen to exercise the parts of the layout that break: a long product title
 * that has to truncate, a two-line variant, a multi-item cart that makes the
 * summary scroll, and a discount so the merchant can see what their "you saved"
 * row actually looks like.
 *
 * Amounts are in paise, matching the real API.
 */

export const SAMPLE_CONTACT: CheckoutContact = {
  phone: "+919876543210",
  email: "priya@example.com",
  firstName: "Priya",
  lastName: "Sharma",
}

export const SAMPLE_ADDRESS: CheckoutAddress = {
  firstName: "Priya",
  lastName: "Sharma",
  address1: "42, Brigade Road",
  address2: "Near MG Road Metro",
  city: "Bengaluru",
  province: "Karnataka",
  provinceCode: "KA",
  zip: "560001",
  country: "India",
  countryCode: "IN",
}

export const SAMPLE_SESSION: PublicCheckoutSession = {
  token: "preview",
  status: "active",
  currency: "INR",
  environment: "test",
  // Carries the address so the delivery block previews in its populated state
  // rather than its "enter an address" one.
  shippingAddress: SAMPLE_ADDRESS,
  items: [
    {
      variantGid: "gid://shopify/ProductVariant/preview-1",
      title: "Everyday Cotton Kurta",
      variantTitle: "Indigo / M",
      imageUrl: undefined,
      quantity: 1,
      unitPrice: 149900,
      lineTotal: 149900,
    },
    {
      variantGid: "gid://shopify/ProductVariant/preview-2",
      title: "Handloom Cotton Dupatta with Zari Border",
      variantTitle: "Mustard",
      imageUrl: undefined,
      quantity: 2,
      unitPrice: 79900,
      lineTotal: 159800,
    },
  ],
  totals: {
    subtotal: 309700,
    discount: 30000,
    shipping: 0,
    tax: 0,
    paymentAdjustment: 0,
    total: 279700,
  },
  discounts: [
    {
      title: "Pay online and save",
      amount: 30000,
      code: "PREPAID100",
      source: "prepaid",
    },
  ],
  contact: {},
  billingSameAsShipping: true,
  selectedMethod: "upi",
  // Two options with different prices, so a merchant previewing their checkout
  // sees the delivery block in its real state rather than its empty one.
  shippingRates: [
    { handle: "preview-standard", title: "Standard delivery (4–6 days)", price: 0 },
    { handle: "preview-express", title: "Express delivery (1–2 days)", price: 9900 },
  ],
  selectedShippingRateHandle: "preview-standard",
  taxIncludedAmount: 42660,
  shippingAvailable: true,
  quoted: true,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
}

/**
 * Methods with deliberately different totals, so the prepaid-saving badges are
 * visible in the preview. A merchant tuning colours needs to see the state that
 * actually converts, not a flat list.
 */
export const SAMPLE_METHODS: PublicPaymentMethod[] = [
  { method: "upi", label: "UPI", total: 279700 },
  { method: "card", label: "Credit / Debit Card", total: 279700 },
  { method: "netbanking", label: "Net Banking", total: 279700 },
  { method: "wallet", label: "Wallets", total: 279700 },
  { method: "cod", label: "Cash on Delivery", total: 309700 },
]

