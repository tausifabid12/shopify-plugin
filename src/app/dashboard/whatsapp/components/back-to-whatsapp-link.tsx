import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function BackToWhatsappLink() {
  return (
    <Link
      href="/dashboard/whatsapp"
      className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Back to WhatsApp
    </Link>
  )
}
