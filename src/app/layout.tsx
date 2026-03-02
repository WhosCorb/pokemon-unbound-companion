import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokemon Unbound Companion",
  description: "Progress-aware companion app for Pokemon Unbound",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PKM Unbound",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F0F2D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gba-bg text-gba-text font-mono min-h-dvh antialiased">
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
