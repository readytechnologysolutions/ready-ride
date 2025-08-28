import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AppSettingsProvider } from "@/contexts/app-settings-context"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import ScrollToTop from "@/components/scroll-to-top"
import ViewportMeta from "@/components/viewport-meta"
import ViewportHeightScript from "@/components/viewport-height-script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ViewportMeta />
        <ViewportHeightScript />
        <AppSettingsProvider>
          <AuthProvider>
            <ScrollToTop>{children}</ScrollToTop>
          </AuthProvider>
        </AppSettingsProvider>
      </body>
    </html>
  )
}
