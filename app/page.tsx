"use client"

import { useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { isOnboardingCompleted } from "@/utils/onboarding-utils"
import { clearParcelData } from "@/utils/parcel-utils"

export default function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    clearParcelData();
    // Redirect after 2 seconds
    const timer = setTimeout(() => {
      // Check if onboarding has been completed
      if (isOnboardingCompleted()) {
        router.push("/home")
      } else {
        router.push("/onboarding")
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex-1 flex items-center justify-center">
        <Image
          src="/logo.jpg"
          alt="Ready Ride Logo"
          width={240}
          height={240}
          priority
          className="animate-pulse-subtle"
        />
      </div>
      <p className="text-secondary mb-12 animate-fadeIn">Powered by ReadyLabs Technology Solutions</p>
    </div>
  )
}
