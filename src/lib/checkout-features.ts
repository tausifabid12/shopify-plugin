import {
  CreditCard,
  Globe,
  Link2,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react"

import type { FeatureSection } from "@/lib/feature-types"

export const checkoutFeatureSections: FeatureSection[] = [
  {
    title: "Payment Methods",
    description:
      "Offer the payment options your customers already trust.",
    items: [
      {
        id: "upi-payments",
        title: "UPI payments",
        description: "Accept instant UPI payments through popular apps.",
        icon: Smartphone,
      },
      {
        id: "cards",
        title: "Credit & debit cards",
        description: "Support Visa, Mastercard, and RuPay card payments.",
        icon: CreditCard,
      },
      {
        id: "wallets",
        title: "Digital wallets",
        description: "Enable wallets like PhonePe, Paytm, and Google Pay.",
        icon: Wallet,
      },
      {
        id: "international",
        title: "International payments",
        description: "Accept payments from customers around the world.",
        icon: Globe,
      },
    ],
  },
  {
    title: "Checkout Experience",
    description:
      "Build a faster, smarter checkout that converts more shoppers.",
    items: [
      {
        id: "smart-links",
        title: "Smart payment links",
        description: "Create shareable, one-click payment links.",
        icon: Link2,
        tag: "Popular",
      },
      {
        id: "qr-checkout",
        title: "QR code checkout",
        description: "Let customers scan a QR code to pay instantly.",
        icon: QrCode,
      },
      {
        id: "auto-receipts",
        title: "Automatic receipts",
        description: "Generate and send receipts after every payment.",
        icon: ReceiptText,
      },
      {
        id: "fraud-protection",
        title: "Fraud protection",
        description: "Keep transactions secure with built-in safeguards.",
        icon: ShieldCheck,
      },
    ],
  },
]
