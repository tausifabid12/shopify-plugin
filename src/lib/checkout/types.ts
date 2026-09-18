/**
 * Shared types for the Checkout & Payments platform.
 *
 * These mirror the serializers in the PingGo server's `checkout` module
 * (`checkout-serializer.ts` for the shopper surface, the admin controller for
 * the dashboard). Keep them in step with the backend — they are the contract.
 *
 * Money rule, inherited from the backend: every amount is an INTEGER in the
 * currency's minor unit (paise for INR). Never format one with plain division
 * in a component — use `formatMoney` from `money.ts`.
 */

// ─── Catalogues ───────────────────────────────────────────────────────────────

export type PaymentProviderKey = "razorpay" | "phonepe"
export type PaymentEnvironment = "test" | "live"
export type PaymentMethodKey = "upi" | "card" | "netbanking" | "wallet" | "cod"

export type CheckoutSessionStatus =
  | "active"
  | "payment_pending"
  | "payment_processing"
  | "paid"
  | "failed"
  | "abandoned"
  | "expired"
  | "cancelled"

export type CheckoutLayout =
  | "single_column"
  | "two_column"
  | "compact"
  | "mobile_first"
  | "minimal"

export type CheckoutFieldKey =
  | "email"
  | "phone"
  | "firstName"
  | "lastName"
  | "address1"
  | "address2"
  | "city"
  | "province"
  | "zip"
  | "country"

export type CheckoutFieldVisibility = "required" | "optional" | "hidden"

// ─── Checkout configuration (merchant's design) ───────────────────────────────

export interface CheckoutBranding {
  logoUrl?: string
  storeName?: string
  primaryColor: string
  secondaryColor: string
  buttonColor: string
  buttonTextColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  fontFamily: string
  borderRadius: number
  layout: CheckoutLayout
}

export interface CheckoutContent {
  checkoutHeading?: string
  contactHeading?: string
  addressHeading?: string
  paymentHeading?: string
  summaryHeading?: string
  payButtonLabel?: string
  trustMessage?: string
  successMessage?: string
  failureMessage?: string
  footerNote?: string
}

export interface CheckoutFieldConfig {
  key: CheckoutFieldKey
  visibility: CheckoutFieldVisibility
  order: number
  label?: string
  placeholder?: string
}

export interface OrderSummaryConfig {
  showProductImages: boolean
  showQuantity: boolean
  showDiscount: boolean
  showTax: boolean
  showShipping: boolean
  collapsedOnMobile: boolean
}

export interface TrustElementConfig {
  showSecureBadge: boolean
  showPaymentLogos: boolean
  badges: { label: string; iconUrl?: string }[]
}

export interface CheckoutBanner {
  text: string
  tone: "info" | "success" | "warning"
}

/**
 * Returning-customer handling (§7). Two independent switches: recognition is
 * frictionless and lifts conversion; OTP protects saved addresses at the cost
 * of a step and a message fee.
 */
export interface CustomerRecognitionConfig {
  enabled: boolean
  requireOtp: boolean
  /** Merchant's approved WhatsApp authentication template. Admin-only. */
  otpTemplateName?: string
}

export interface CheckoutConfigPayload {
  branding: CheckoutBranding
  content: CheckoutContent
  fields: CheckoutFieldConfig[]
  orderSummary: OrderSummaryConfig
  trust: TrustElementConfig
  methodMessaging?: Record<string, string>
  banners: CheckoutBanner[]
  recognition: CustomerRecognitionConfig
}

// ─── Shopper-facing session ───────────────────────────────────────────────────

export interface CheckoutItem {
  variantGid: string
  title: string
  variantTitle?: string
  imageUrl?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  /** A gift granted by an offer — priced at zero, but a real line (§24). */
  isGift?: boolean
}

export interface CheckoutTotals {
  subtotal: number
  discount: number
  shipping: number
  tax: number
  paymentAdjustment: number
  total: number
}

export interface CheckoutAddress {
  firstName?: string
  lastName?: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  provinceCode?: string
  zip?: string
  country?: string
  countryCode?: string
}

export interface CheckoutContact {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
}

export interface PublicCheckoutSession {
  token: string
  status: CheckoutSessionStatus
  currency: string
  environment: PaymentEnvironment
  items: CheckoutItem[]
  totals: CheckoutTotals
  discounts: AppliedDiscount[]
  /** Coupon the shopper entered, so the field can show it as applied. */
  appliedCouponCode?: string
  contact: CheckoutContact
  shippingAddress?: CheckoutAddress
  billingAddress?: CheckoutAddress
  billingSameAsShipping: boolean
  selectedMethod?: PaymentMethodKey
  /** Delivery options quoted by Shopify from the merchant's shipping zones. */
  shippingRates: ShippingRateOption[]
  selectedShippingRateHandle?: string
  /** GST already contained in the prices (MRP), rather than added on top. */
  taxIncludedAmount: number
  /** False when the merchant doesn't ship to the entered address. */
  shippingAvailable: boolean
  /** True once tax and shipping have been quoted for the current address. */
  quoted: boolean
  expiresAt: string
}

export type DiscountSource = "coupon" | "prepaid" | "cod_fee" | "automatic"

export interface AppliedDiscount {
  title: string
  /** Integer, minor units. */
  amount: number
  code?: string
  source: DiscountSource
}

export interface ShippingRateOption {
  /** Shopify's opaque rate identifier — echoed back verbatim on selection. */
  handle: string
  title: string
  /** Integer, minor units. */
  price: number
}

export interface PublicPaymentMethod {
  method: PaymentMethodKey
  label: string
  description?: string
  /** What this order costs paying by this method — prepaid discounts move it. */
  total: number
}

/** An offer the cart nearly qualifies for — "add ₹500 more for free shipping". */
export interface OfferNudge {
  message: string
  /** Integer, minor units. */
  shortfall: number
}

export interface CheckoutBootstrap {
  session: PublicCheckoutSession
  config: CheckoutConfigPayload
  paymentMethods: PublicPaymentMethod[]
  nudges: OfferNudge[]
}

// ─── Returning customers (§7) ─────────────────────────────────────────────────

export interface RecognitionResult {
  known: boolean
  requiresVerification: boolean
  firstName?: string
  addresses: CheckoutAddress[]
  previousOrders?: number
}

export interface OtpSendResult {
  sent: boolean
  expiresInSeconds: number
  maskedPhone: string
}

export interface OtpVerifyResult {
  verified: boolean
  addresses: CheckoutAddress[]
  firstName?: string
}

// ─── Payment attempts ─────────────────────────────────────────────────────────

/**
 * How the shopper completes payment. The provider decides; the page just
 * mounts what it is told.
 *
 *  - `embedded` — gateway component opens over our page (Razorpay Checkout.js)
 *  - `iframe`   — gateway page renders inside ours (PhonePe Standard Checkout)
 *  - `redirect` — full-page navigation away and back
 */
export type PaymentFlow = "embedded" | "iframe" | "redirect"

export interface CreateAttemptResult {
  attemptRef: string
  provider: PaymentProviderKey
  flow: PaymentFlow
  /** Opaque, gateway-specific, browser-safe. Never contains a secret. */
  clientPayload: Record<string, unknown>
  redirectUrl?: string
  amount: number
  currency: string
  reused: boolean
}

export interface VerifyAttemptResult {
  status: "succeeded" | "failed" | "pending" | string
  sessionStatus: CheckoutSessionStatus
}

export interface CheckoutStatusResult {
  status: CheckoutSessionStatus
  paid: boolean
  total?: number
  currency?: string
  order: { status: string; name?: string } | null
}

// ─── Merchant dashboard ───────────────────────────────────────────────────────

export interface CredentialSummary {
  provider: PaymentProviderKey
  environment: PaymentEnvironment
  connected: boolean
  enabled: boolean
  publicKeyMasked: string
  hasWebhookSecret: boolean
  clientVersion?: string
  verifiedAt?: string
  verificationError?: string
  lastUsedAt?: string
  updatedAt?: string
}

export interface RouteRule {
  method: PaymentMethodKey
  enabled: boolean
  primaryProvider?: PaymentProviderKey
  fallbackProvider?: PaymentProviderKey
  sortOrder: number
  description?: string
}

export interface CheckoutOverview {
  environment: PaymentEnvironment
  checkoutEnabled: boolean
  liveEnabledAt?: string
  configVersion: number
  hasPublishedConfig: boolean
  credentials: CredentialSummary[]
  routing: RouteRule[]
  providers: {
    key: PaymentProviderKey
    label: string
    supportedMethods: PaymentMethodKey[]
  }[]
  alerts: { stuckOrders: number; stuckOrderIds: string[] }
}

export interface CheckoutConfigState {
  draft: CheckoutConfigPayload
  published: CheckoutConfigPayload | null
  version: number
  publishedAt?: string
  hasUnpublishedChanges: boolean
}

// ─── Dashboard records ────────────────────────────────────────────────────────

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface SessionRow {
  _id: string
  token: string
  status: CheckoutSessionStatus
  environment: PaymentEnvironment
  currency: string
  totals: CheckoutTotals
  contact: CheckoutContact
  selectedMethod?: PaymentMethodKey
  createdAt: string
  completedAt?: string
  abandonedAt?: string
}

export interface AbandonedRow extends SessionRow {
  items: CheckoutItem[]
  lastActivityAt: string
  attribution?: {
    source?: string
    medium?: string
    campaign?: string
    referrer?: string
  }
}

export type TransactionStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded"

export interface TransactionRow {
  _id: string
  sessionId: string
  attemptId: string
  provider: PaymentProviderKey
  environment: PaymentEnvironment
  method: PaymentMethodKey
  providerPaymentId: string
  providerOrderId?: string
  providerReferenceId?: string
  amount: number
  currency: string
  amountRefunded: number
  status: TransactionStatus
  feeAmount?: number
  verifiedVia?: string
  failureReason?: string
  createdAt: string
  completedAt?: string
}

export type AttemptStatus =
  | "created"
  | "initiated"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired"

export interface AttemptRow {
  _id: string
  attemptRef: string
  sessionId: string
  method: PaymentMethodKey
  provider: PaymentProviderKey
  status: AttemptStatus
  amount: number
  currency: string
  isFallback: boolean
  providerOrderId?: string
  providerPaymentId?: string
  failureCode?: string
  failureReason?: string
  createdAt: string
  completedAt?: string
}

export type OrderSyncStatus = "pending" | "creating" | "created" | "failed"

export interface OrderRow {
  _id: string
  sessionId: string
  transactionId?: string
  syncStatus: OrderSyncStatus
  shopifyOrderGid?: string
  shopifyOrderName?: string
  amount: number
  currency: string
  attempts: number
  lastError?: string
  createdAt: string
}

export type RefundStatus = "pending" | "processing" | "succeeded" | "failed"

export interface RefundRow {
  _id: string
  refundRef: string
  transactionId: string
  provider: PaymentProviderKey
  providerRefundId?: string
  amount: number
  currency: string
  isFull: boolean
  status: RefundStatus
  reason?: string
  failureReason?: string
  createdAt: string
  processedAt?: string
}

export interface TimelineEvent {
  type: string
  message: string
  data?: Record<string, unknown>
  createdAt: string
}

export interface SessionDetail {
  session: SessionRow & {
    items: CheckoutItem[]
    shippingAddress?: CheckoutAddress
    discounts: { title: string; amount: number; code?: string }[]
    shopDomain: string
    expiresAt: string
  }
  attempts: AttemptRow[]
  transactions: TransactionRow[]
  order: OrderRow | null
  timeline: TimelineEvent[]
}

export interface TransactionDetail {
  transaction: TransactionRow
  refunds: RefundRow[]
  order: OrderRow | null
  session: {
    _id: string
    token: string
    contact: CheckoutContact
    items: CheckoutItem[]
    totals: CheckoutTotals
    currency: string
  } | null
}

// ─── Offers (§24) ─────────────────────────────────────────────────────────────

export type OfferType =
  | "coupon"
  | "automatic"
  | "prepaid"
  | "cod_fee"
  | "free_shipping"
  | "free_gift"

export type OfferValueType = "fixed" | "percentage"

export interface Offer {
  _id: string
  name: string
  type: OfferType
  code?: string
  valueType: OfferValueType
  /** Minor units for `fixed`; basis points for `percentage` (1000 = 10%). */
  value: number
  maxDiscount?: number
  /** The product given away, for `free_gift`. */
  giftVariantGid?: string
  giftQuantity?: number
  minSubtotal?: number
  paymentMethods: PaymentMethodKey[]
  enabled: boolean
  startsAt?: string
  endsAt?: string
  usageLimit?: number
  usageCount: number
  perCustomerLimit?: number
  priority: number
  stackable: boolean
  message?: string
  environment: PaymentEnvironment
  createdAt: string
}

export type OfferInput = Omit<Offer, "_id" | "usageCount" | "createdAt">

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  coupon: "Discount code",
  automatic: "Automatic discount",
  prepaid: "Pay-online discount",
  cod_fee: "Cash-on-delivery fee",
  free_shipping: "Free shipping",
  free_gift: "Free gift",
}

// ─── Customers (§25) ──────────────────────────────────────────────────────────

export interface CustomerRow {
  _id: string
  phone?: string
  email?: string
  firstName?: string
  lastName?: string
  savedAddresses: CheckoutAddress[]
  totalOrders: number
  /** Integer, minor units. */
  totalSpent: number
  lastSeenAt: string
  createdAt: string
}

export interface CustomerDetail {
  customer: CustomerRow
  sessions: SessionRow[]
  transactions: TransactionRow[]
}

export const OFFER_TYPE_HINTS: Record<OfferType, string> = {
  coupon: "Applies when the shopper enters a code at checkout.",
  automatic: "Applies to every order that meets the conditions.",
  prepaid:
    "Applies to any prepaid method — the usual lever for shifting orders off cash on delivery.",
  cod_fee: "Adds a surcharge when the shopper chooses cash on delivery.",
  free_shipping: "Waives the shipping charge.",
  free_gift: "Adds a product to the cart at no charge once the conditions are met.",
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsPreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "custom"

export interface PaymentMetrics {
  totalRevenue: number
  netRevenue: number
  successfulPayments: number
  failedPayments: number
  pendingPayments: number
  refundedAmount: number
  refundCount: number
  averageOrderValue: number
  paymentSuccessRate: number
  paymentFailureRate: number
}

export interface CheckoutMetrics {
  sessions: number
  completed: number
  abandoned: number
  expired: number
  conversionRate: number
  abandonmentRate: number
  averageCheckoutValue: number
  medianTimeToPaySeconds: number
}

export interface FunnelStep {
  key: string
  label: string
  count: number
  rateOfTotal: number
  rateOfPrevious: number
}

export interface Breakdown {
  key: string
  attempts: number
  succeeded: number
  successRate: number
  amount: number
}

export interface TimeseriesPoint {
  date: string
  sessions: number
  paid: number
  revenue: number
}

export interface AnalyticsResult {
  range: { from: string; to: string; environment: PaymentEnvironment }
  payments: PaymentMetrics
  checkout: CheckoutMetrics
  funnel: FunnelStep[]
  byMethod: Breakdown[]
  byProvider: Breakdown[]
  timeseries: TimeseriesPoint[]
  currency: string
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  upi: "UPI",
  card: "Credit / Debit Card",
  netbanking: "Net Banking",
  wallet: "Wallets",
  cod: "Cash on Delivery",
}

export const LAYOUT_LABELS: Record<CheckoutLayout, string> = {
  single_column: "Single column",
  two_column: "Two column",
  compact: "Compact",
  mobile_first: "Mobile first",
  minimal: "Minimal",
}

export const FIELD_LABELS: Record<CheckoutFieldKey, string> = {
  email: "Email",
  phone: "Phone",
  firstName: "First name",
  lastName: "Last name",
  address1: "Address",
  address2: "Apartment, suite, etc.",
  city: "City",
  province: "State",
  zip: "PIN code",
  country: "Country",
}
