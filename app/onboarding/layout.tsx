import type React from "react"
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <main className="flex min-h-screen flex-col items-center justify-between bg-white">{children}</main>
}
