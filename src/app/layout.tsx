import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ClientBody from "./ClientBody";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Real Estate Analyzer - Commercial Property Deal Analysis",
  description:
    "Professional commercial real estate deal analysis platform with tax assessor integration, market data, and comprehensive financial modeling",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRE Analyzer"
  },
  formatDetection: {
    telephone: false
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "CRE Analyzer",
    "application-name": "CRE Analyzer",
    "msapplication-TileColor": "#2563eb",
    "msapplication-tap-highlight": "no"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563eb"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        <ClientBody>{children}</ClientBody>
        <Toaster position="top-right" />
      </body>
    </html>
  );

  if (clerkPublishableKey) {
    return (
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        appearance={{
          baseTheme: undefined,
          variables: {
            colorPrimary: "#2563eb",
            colorTextOnPrimaryBackground: "#ffffff",
          },
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
            card: "shadow-lg",
            headerTitle: "text-blue-900 font-bold",
            headerSubtitle: "text-gray-600",
          },
        }}
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}