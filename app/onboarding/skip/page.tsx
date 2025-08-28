"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { markOnboardingCompleted } from "@/utils/onboarding-utils"

export default function SkipPage() {
  const router = useRouter()

  useEffect(() => {
    // Mark onboarding as completed when skipping
    markOnboardingCompleted()

    // Redirect to home after a short delay
    const timer = setTimeout(() => {
      router.push("/home")
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div>
      <h1>Skipping Onboarding...</h1>
    </div>
  )
}
