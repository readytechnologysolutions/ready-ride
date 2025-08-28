"use client"

import type React from "react"

import { useScrollTop } from "@/hooks/use-scroll-top"

export default function ScrollToTop({ children }: { children: React.ReactNode }) {
  useScrollTop()

  return <>{children}</>
}
