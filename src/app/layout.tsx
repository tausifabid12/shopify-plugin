import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
          App Bridge. Shopify requires it to be the first script in the
          document, which is why it uses `beforeInteractive` rather than being
          dropped in the body — anything else and the admin reports the app as
          "not loading".

          It is loaded on every page, not only embedded ones: the script is a
          no-op outside the Shopify admin, and gating it on a query parameter
          would mean it is missing exactly when a deep link needs it.
        */}
        {apiKey && (
          <Script
            src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
            data-api-key={apiKey}
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
