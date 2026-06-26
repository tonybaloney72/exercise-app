import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppVersionSync from "@/components/layout/AppVersionSync";
import WhatsNewSync from "@/components/layout/WhatsNewSync";
import CapacitorShellSync from "@/components/layout/CapacitorShellSync";
import NativeOAuthSync from "@/components/auth/NativeOAuthSync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyExercise",
  description: "Daily workout tracker & fitness companion",
  applicationName: "MyExercise",
  openGraph: {
    title: "MyExercise",
    siteName: "MyExercise",
    type: "website",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyExercise",
  },
  other: {
    "apple-mobile-web-app-title": "MyExercise",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f1117",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1170x2532.png"
          media="(orientation: portrait)"
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <CapacitorShellSync />
        <NativeOAuthSync />
        <AppVersionSync />
        <WhatsNewSync />
        {children}
      </body>
    </html>
  );
}
