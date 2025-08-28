"use client"

import { useState, useEffect } from "react"

export function useViewportHeight() {
  const [height, setHeight] = useState("100vh")

  useEffect(() => {
    // Function to update height
    const updateHeight = () => {
      // Use window.innerHeight for more accurate viewport height
      setHeight(`${window.innerHeight}px`)
    }

    // Initial update
    updateHeight()

    // Update on resize
    window.addEventListener("resize", updateHeight)

    // Update on orientation change for mobile devices
    window.addEventListener("orientationchange", updateHeight)

    return () => {
      window.removeEventListener("resize", updateHeight)
      window.removeEventListener("orientationchange", updateHeight)
    }
  }, [])

  return height
}
