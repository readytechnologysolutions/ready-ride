"use client"

import Image from "next/image"
import Link from "next/link"
import { useViewportHeight } from "@/hooks/use-viewport-height"

export default function OnboardingClientPage() {
  const viewportHeight = useViewportHeight()

  return (
    <div className="onboarding-container" style={{ height: viewportHeight }}>
      <div className="onboarding-image-container">
        <Image
          width={300}
          height={300}
         src="/onboard-1.png" alt="Delicious food" fill className="onboarding-image" priority />
      </div>

      <h1 className="onboarding-heading">Delicious Meals, Just a Tap Away</h1>
      <p className="onboarding-text">Discover and order from your favorite restaurants with ease.</p>

      <div className="pagination-dots">
        <div className="pagination-dot active"></div>
        <div className="pagination-dot bg-gray-300"></div>
        <div className="pagination-dot bg-gray-300"></div>
      </div>

      <div className="navigation-buttons">
        <Link href="/onboarding/skip" className="text-secondary font-medium">
          Skip
        </Link>
        <Link href="/onboarding/2" className="text-primary font-medium">
          Next
        </Link>
      </div>
    </div>
  )
}
