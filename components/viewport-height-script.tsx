"use client"

import { useEffect } from "react"

export default function ViewportHeightScript() {
  useEffect(() => {
    // Function to update the CSS variable
    const updateVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    // Initial update
    updateVh()

    // Update on resize
    window.addEventListener("resize", updateVh)

    // Update on orientation change for mobile devices
    window.addEventListener("orientationchange", updateVh)

    return () => {
      window.removeEventListener("resize", updateVh)
      window.removeEventListener("orientationchange", updateVh)
    }
  }, [])

  return null
}
