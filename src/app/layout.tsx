import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PingGo for Shopify",
  description: "Connect WhatsApp automation to your Shopify store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The client ID, not the secret. It is public by design — it already appears
  // in every OAuth URL — and App Bridge needs it to identify the app.
  const apiKey = process.env.SHOPIFY_API_KEY ?? "";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          App Bridge — a PLAIN script tag, deliberately not next/script.

          `next/script` with `beforeInteractive` does not emit a real tag in the
          App Router. It emits a queue entry:

            <script>(self.__next_s=self.__next_s||[]).push(["…app-bridge.js",…])</script>

          Next's runtime injects the script later, which is too late and too
          indirect for App Bridge: it must be a genuine, early script tag or
          `window.shopify` is never defined and the admin reports the app as not
          loading.

          Rendered here in <head> so it is among the first scripts in the
          document. It is loaded on every page rather than only embedded ones —
          it is inert outside the Shopify admin, and gating it on a query
          parameter would mean it was missing exactly when a deep link needed it.
        */}
        {apiKey && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
            data-api-key={apiKey}
          />
        )}
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
