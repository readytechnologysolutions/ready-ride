"use client"

import { useEffect } from "react"

export default function ViewportMeta() {
  useEffect(() => {
    // This ensures the viewport is properly set for all devices
    const meta = document.createElement("meta")
    meta.name = "viewport"
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no"
    document.head.appendChild(meta)

    // Add a class to handle iOS safe areas
    document.documentElement.classList.add("has-safe-area")

    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  return null
}
