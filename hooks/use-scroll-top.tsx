"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function useScrollTop() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }, [pathname])
}
